import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "#models/User";
import AuthProvider from "#models/AuthProvider";
import config from "#config/index";
import crypto from "crypto";
import { redisClient } from "#config/redis";
import AppError from "#shared/AppError";
import axios from "axios";
import { OAuth2Client } from "google-auth-library";
import { sendOTPEmail } from "#config/email";
import speakeasy from "speakeasy";
import QRCode from "qrcode";
import PersonalAccessToken from "#models/PersonalAccessToken";
// Token generation helpers
const generateAccessToken = (userId, username) => {
  return jwt.sign({ id: userId, username }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
};

const generateRefreshToken = (userId, username) => {
  return jwt.sign({ id: userId, username }, config.jwtRefreshSecret, {
    expiresIn: "30d",
  });
};

const generateLoginChallengeToken = (userId, method) => {
  return jwt.sign(
    {
      id: userId,
      purpose: "2fa_login",
      method,
    },
    config.jwtSecret,
    { expiresIn: "5m" },
  );
};

const twoFactorEncryptionKey = crypto
  .createHash("sha256")
  .update(config.twoFactorEncryptionKey || config.jwtSecret)
  .digest();

const encryptSecret = (value) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", twoFactorEncryptionKey, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    encrypted: encrypted.toString("hex"),
    iv: iv.toString("hex"),
    authTag: authTag.toString("hex"),
  };
};

const decryptSecret = (encrypted, iv, authTag) => {
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    twoFactorEncryptionKey,
    Buffer.from(iv, "hex"),
  );
  decipher.setAuthTag(Buffer.from(authTag, "hex"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encrypted, "hex")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
};

const generateRecoveryCodes = async (count = 8) => {
  const plainCodes = Array.from({ length: count }, () =>
    crypto.randomBytes(4).toString("hex"),
  );
  const hashedCodes = await Promise.all(
    plainCodes.map((code) => bcrypt.hash(code, 10)),
  );
  return { plainCodes, hashedCodes };
};

const hashPAT = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

// REGISTER SERVICE
export const registerUser = async (username, email, password) => {
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new AppError("Email already registered", 400);
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const newUser = await User.create({
    username,
    email,
    password: hashedPassword,
  });

  await AuthProvider.create({
    userId: newUser._id,
    provider: "local",
  });
 const otp = Math.floor(100000 + Math.random() * 900000).toString();
const hashedOTP = await bcrypt.hash(otp, 10);
newUser.emailOTP = hashedOTP;
newUser.emailOTPExpires = new Date(Date.now() + 10 * 60 * 1000);
await newUser.save();
try {
  await sendOTPEmail(email, otp);
} catch (emailErr) {
  console.error("Email send failed:", emailErr.message);
  // Don't throw - user is already created
}


  return {
    _id: newUser._id,
    username: newUser.username,
    email: newUser.email,
    profileImage: newUser.profileImage,
  };
};

// LOGIN SERVICE
export const loginUser = async (email, password) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new AppError("User not found", 404);
  }

  let localProvider = await AuthProvider.findOne({
    userId: user._id,
    provider: "local",
  });

  // Auto-migration fallback
  if (!localProvider && user.password) {

    localProvider = await AuthProvider.create({
      userId: user._id,
      provider: "local",
    });

  }

  if (!localProvider) {
    throw new AppError(
      "This account was created with Google or Facebook. Please use social login.",
      400,
    );
  }
if (!user.isEmailVerified) {
  throw new AppError("Please verify your email first", 403);
}
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new AppError("Invalid email or password", 401);
  }

  if (user.twoFactorEnabled) {
    if (user.twoFactorMethod === "email") {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      user.email2faOtpHash = await bcrypt.hash(otp, 10);
      user.email2faOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
      user.email2faOtpAttempts = 0;
      await user.save();
      await sendOTPEmail(user.email, otp);
    }

    return {
      requires2fa: true,
      twoFactorMethod: user.twoFactorMethod,
      challengeToken: generateLoginChallengeToken(user._id, user.twoFactorMethod),
    };
  }

  // Generate both tokens
  const accessToken = generateAccessToken(user._id, user.username);
  const refreshToken = generateRefreshToken(user._id, user.username);

  // Redis mein save karo
  try {
    await redisClient.set(
      `refresh:${user._id}`,
      refreshToken,
      { EX: 30 * 24 * 60 * 60 }, // 30 din
    );
  } catch (err) {
    console.error(" Redis refresh token save error:", err);
  }


  return {
    accessToken,
    refreshToken,
    username: user.username,
    profileImage: user.profileImage,
    requires2fa: false,
  };
};

// GOOGLE OAUTH SERVICE
export const handleGoogleAuth = async (code) => {
  const client = new OAuth2Client(
    config.google.clientId,
    config.google.clientSecret,
  );

  const { tokens } = await client.getToken({
    code,
    redirect_uri: "postmessage",
  });

  const ticket = await client.verifyIdToken({
    idToken: tokens.id_token,
    audience: config.google.clientId,
  });

  const payload = ticket.getPayload();
  const email = payload.email;
  const name = payload.name;
  const picture = payload.picture;
  const googleId = payload.sub;

  let user = await User.findOne({ email });

if (user) {
    const googleProvider = await AuthProvider.findOne({
      userId: user._id,
      provider: "google",
    });

    if (!googleProvider) {
      await AuthProvider.create({
        userId: user._id,
        provider: "google",
        providerId: googleId,
        providerData: { name, picture },
      });
    }

    if (!user.profileImage && picture) {
      user.profileImage = picture;
    }
    if (!user.isEmailVerified) {
      user.isEmailVerified = true;
    }
    await user.save();
  }
   else {
    let username = name || `user_${Date.now()}`;
    const existingUsername = await User.findOne({ username });
    if (existingUsername) username = `${username}_${Date.now()}`;

user = await User.create({ email, username, profileImage: picture, isEmailVerified: true });
    await AuthProvider.create({
      userId: user._id,
      provider: "google",
      providerId: googleId,
      providerData: { name, picture },
    });
  }

  const accessToken = generateAccessToken(user._id, user.username);
  const refreshToken = generateRefreshToken(user._id, user.username);

  await redisClient.set(`refresh:${user._id}`, refreshToken, {
    EX: 30 * 24 * 60 * 60,
  });

  return {
    accessToken,
    refreshToken,
    username: user.username,
    profileImage: user.profileImage || "",
  };
};

// FACEBOOK OAUTH SERVICE

export const handleFacebookAuth = async (accessToken) => {
  const { data } = await axios.get(
    `https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${accessToken}`,
  );

  const email = data.email;
  if (!email) throw new AppError("Email not provided by Facebook", 400);

  const facebookId = data.id;
  const name = data.name;
  const picture = data.picture?.data?.url;

  let user = await User.findOne({ email });

  if (user) {
    const facebookProvider = await AuthProvider.findOne({
      userId: user._id,
      provider: "facebook",
    });
if (!facebookProvider) {
      await AuthProvider.create({
        userId: user._id,
        provider: "facebook",
        providerId: facebookId,
        providerData: { name, picture },
      });
    }

    if (!user.profileImage && picture) {
      user.profileImage = picture;
    }
    if (!user.isEmailVerified) {
      user.isEmailVerified = true;
    }
    await user.save();
  } else {
    let username = name || `user_${Date.now()}`;
    const existingUsername = await User.findOne({ username });
    if (existingUsername) username = `${username}_${Date.now()}`;

user = await User.create({ email, username, profileImage: picture, isEmailVerified: true });
    await AuthProvider.create({
      userId: user._id,
      provider: "facebook",
      providerId: facebookId,
      providerData: { name, picture },
    });
  }

  const jwtAccessToken = generateAccessToken(user._id, user.username);
  const jwtRefreshToken = generateRefreshToken(user._id, user.username);

  await redisClient.set(`refresh:${user._id}`, jwtRefreshToken, {
    EX: 30 * 24 * 60 * 60,
  });

  return {
    accessToken: jwtAccessToken,
    refreshToken: jwtRefreshToken,
    username: user.username,
    profileImage: user.profileImage || "",
  };
};
// FORGOT PASSWORD SERVICE
export const processForgotPassword = async (email) => {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    // Security: Don't reveal if email exists
    return {
      message: "If this email exists, a reset link has been sent",
      resetUrl: null,
    };
  }

  // Generate secure reset token
  const resetToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  // Save hashed token to database
  user.resetPasswordToken = hashedToken;
  user.resetPasswordExpires = new Date(
    Date.now() + config.resetToken.expiryMinutes * 60 * 1000,
  );
  await user.save();

  // Create reset URL
  const resetUrl = `${config.frontend.url}/reset-password/${resetToken}`;

 

  return {
    message: "Password reset link generated successfully",
    resetUrl: config.nodeEnv === "development" ? resetUrl : null,
    expiresIn:
      config.nodeEnv === "development"
        ? config.resetToken.expiryMinutes + " minutes"
        : null,
  };
};

// RESET PASSWORD SERVICE
export const processResetPassword = async (token, newPassword) => {
  // Hash the token to compare with database
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  // Find user with valid token
  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: Date.now() },
  });

  if (!user) {
    throw new AppError("Invalid or expired reset token", 400);
  }

  // Hash new password
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // Update password and clear reset token
  user.password = hashedPassword;
  user.resetPasswordToken = null;
  user.resetPasswordExpires = null;
  await user.save();

  // Ensure local auth provider exists
  let localProvider = await AuthProvider.findOne({
    userId: user._id,
    provider: "local",
  });

  if (!localProvider) {
    await AuthProvider.create({
      userId: user._id,
      provider: "local",
    });
  }


  return { message: "Password reset successful" };
};

// SET PASSWORD SERVICE
export const setUserPassword = async (userId, newPassword) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError("User not found", 404);
  }

  // Check only if password already exists
  if (user.password) {
    throw new AppError(
      "You already have a password. Use 'Change Password' instead.",
      400,
    );
  }

  // Hash and set password
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  user.password = hashedPassword;
  await user.save();

  // Create local auth provider if doesn't exist
  const localProvider = await AuthProvider.findOne({
    userId: user._id,
    provider: "local",
  });

  if (!localProvider) {
    await AuthProvider.create({
      userId: user._id,
      provider: "local",
    });
  }


  return { message: "Password set successfully" };
};

// GET CURRENT USER SERVICE
export const fetchCurrentUser = async (userId) => {
  const user = await User.findById(userId).select(
    "-resetPasswordToken -resetPasswordExpires",
  );

  if (!user) {
    throw new AppError("User not found", 404);
  }

  // Check password existence properly
  const hasPassword = !!(user.password && user.password.length > 0);

  // Check all auth providers for this user
  const authProviders = await AuthProvider.find({ userId: user._id });

  const hasLocalAuth = authProviders.some((p) => p.provider === "local");
  const hasGoogleAuth = authProviders.some((p) => p.provider === "google");
  const hasFacebookAuth = authProviders.some((p) => p.provider === "facebook");

  const primaryProvider =
    authProviders.length > 0 ? authProviders[0].provider : "local";

  


  return {
    _id: user._id,
    username: user.username,
    email: user.email,
    profileImage: user.profileImage,
    coverPhoto: user.coverPhoto,
    hasPassword,
    hasLocalAuth,
    hasGoogleAuth,
    hasFacebookAuth,
    twoFactorEnabled: user.twoFactorEnabled,
    twoFactorMethod: user.twoFactorMethod,
    primaryProvider,
    createdAt: user.createdAt,
  };
};

// CHANGE PASSWORD SERVICE
export const changeUserPassword = async (userId, oldPassword, newPassword) => {
  // Get user
  const user = await User.findById(userId);
  if (!user || !user.password) {
    throw new AppError("No password set. Use 'Set Password' first.", 400);
  }

  // Verify old password
  const isMatch = await bcrypt.compare(oldPassword, user.password);
  if (!isMatch) {
    throw new AppError("Current password is incorrect", 400);
  }

  // Check if new password is same as old
  const isSamePassword = await bcrypt.compare(newPassword, user.password);
  if (isSamePassword) {
    throw new AppError(
      "New password must be different from current password",
      400,
    );
  }

  // Hash and update password
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  user.password = hashedPassword;
  await user.save();


  return { message: "Password changed successfully" };
};

// REFRESH TOKEN SERVICE
export const refreshAccessToken = async (refreshToken) => {
  const decoded = jwt.verify(refreshToken, config.jwtRefreshSecret);

  // Redis se check karo
  try {
    const savedToken = await redisClient.get(`refresh:${decoded.id}`);
    if (!savedToken || savedToken !== refreshToken) {
      throw new AppError("Invalid refresh token", 403);
    }
  } catch (err) {
    if (err.message === "Invalid refresh token") throw err;
    console.error(" Redis check error:", err);
  }

  const newAccessToken = generateAccessToken(decoded.id, decoded.username);
  return { accessToken: newAccessToken };
};
// VERIFY OTP SERVICE
export const verifyOTPService = async (email, otp) => {
  const user = await User.findOne({ email });
  if (!user) throw new AppError("User not found", 404);

  if (!user.emailOTP || !user.emailOTPExpires) {
    throw new AppError("OTP not found, please register again", 400);
  }

  if (user.emailOTPExpires < new Date()) {
    throw new AppError("OTP expired", 400);
  }
//
const isMatch = await bcrypt.compare(otp, user.emailOTP);
if (!isMatch) {
  throw new AppError("Invalid OTP", 400);
}

  user.isEmailVerified = true;
  user.emailOTP = null;
  user.emailOTPExpires = null;
  await user.save();

  return { message: "Email verified successfully" };
};

// RESEND OTP SERVICE
export const resendOTPService = async (email) => {
  const user = await User.findOne({ email });
  if (!user) throw new AppError("User not found", 404);

  if (user.isEmailVerified) {
    throw new AppError("Email already verified", 400);
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
const hashedOTP = await bcrypt.hash(otp, 10);
user.emailOTP = hashedOTP;
  user.emailOTPExpires = new Date(Date.now() + 10 * 60 * 1000);
  await user.save();

  await sendOTPEmail(email, otp);

  return { message: "OTP resent successfully" };
};

// UPDATE PUBLIC KEY SERVICE
export const updatePublicKeyService = async (userId, publicKey) => {
  const user = await User.findById(userId);
  if (!user) throw new AppError("User not found", 404);

  user.publicKey = publicKey;
  await user.save();

  return { message: "Public key updated successfully" };
};

export const get2FAStatusService = async (userId) => {
  const user = await User.findById(userId).select("twoFactorEnabled twoFactorMethod");
  if (!user) throw new AppError("User not found", 404);
  return {
    enabled: user.twoFactorEnabled,
    method: user.twoFactorMethod,
  };
};

export const startTOTPSetupService = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new AppError("User not found", 404);

  const secret = speakeasy.generateSecret({
    length: 20,
    name: `Chat System (${user.email})`,
  });
  const encrypted = encryptSecret(secret.base32);

  user.totpTempSecretEncrypted = encrypted.encrypted;
  user.totpTempSecretIv = encrypted.iv;
  user.totpTempSecretAuthTag = encrypted.authTag;
  await user.save();

  const qrDataUrl = await QRCode.toDataURL(secret.otpauth_url);

  return {
    otpauthUrl: secret.otpauth_url,
    base32: secret.base32,
    qrCodeDataUrl: qrDataUrl,
  };
};

export const verifyTOTPSetupService = async (userId, code) => {
  const user = await User.findById(userId);
  if (!user) throw new AppError("User not found", 404);
  if (!user.totpTempSecretEncrypted || !user.totpTempSecretIv || !user.totpTempSecretAuthTag) {
    throw new AppError("TOTP setup not initialized", 400);
  }

  const tempSecret = decryptSecret(
    user.totpTempSecretEncrypted,
    user.totpTempSecretIv,
    user.totpTempSecretAuthTag,
  );

  const verified = speakeasy.totp.verify({
    secret: tempSecret,
    encoding: "base32",
    token: code,
    window: 1,
  });

  if (!verified) {
    throw new AppError("Invalid authenticator code", 400);
  }

  const encrypted = encryptSecret(tempSecret);
  const { plainCodes, hashedCodes } = await generateRecoveryCodes();

  user.twoFactorEnabled = true;
  user.twoFactorMethod = "totp";
  user.twoFactorVerifiedAt = new Date();
  user.totpSecretEncrypted = encrypted.encrypted;
  user.totpSecretIv = encrypted.iv;
  user.totpSecretAuthTag = encrypted.authTag;
  user.totpTempSecretEncrypted = null;
  user.totpTempSecretIv = null;
  user.totpTempSecretAuthTag = null;
  user.recoveryCodes = hashedCodes;
  await user.save();

  return {
    message: "TOTP 2FA enabled successfully",
    recoveryCodes: plainCodes,
  };
};

export const startEmail2FASetupService = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new AppError("User not found", 404);

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  user.email2faOtpHash = await bcrypt.hash(otp, 10);
  user.email2faOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
  user.email2faOtpAttempts = 0;
  await user.save();
  await sendOTPEmail(user.email, otp);

  return { message: "2FA verification code sent to your email" };
};

export const verifyEmail2FASetupService = async (userId, code) => {
  const user = await User.findById(userId);
  if (!user) throw new AppError("User not found", 404);
  if (!user.email2faOtpHash || !user.email2faOtpExpiresAt) {
    throw new AppError("Email 2FA setup not initialized", 400);
  }
  if (user.email2faOtpExpiresAt < new Date()) {
    throw new AppError("Verification code expired", 400);
  }
  if (user.email2faOtpAttempts >= 5) {
    throw new AppError("Too many invalid attempts. Please request a new code.", 429);
  }

  const isMatch = await bcrypt.compare(code, user.email2faOtpHash);
  if (!isMatch) {
    user.email2faOtpAttempts += 1;
    await user.save();
    throw new AppError("Invalid verification code", 400);
  }

  const { plainCodes, hashedCodes } = await generateRecoveryCodes();
  user.twoFactorEnabled = true;
  user.twoFactorMethod = "email";
  user.twoFactorVerifiedAt = new Date();
  user.email2faOtpHash = null;
  user.email2faOtpExpiresAt = null;
  user.email2faOtpAttempts = 0;
  user.recoveryCodes = hashedCodes;
  await user.save();

  return {
    message: "Email 2FA enabled successfully",
    recoveryCodes: plainCodes,
  };
};

export const verifyLogin2FAService = async (challengeToken, code) => {
  let decoded;
  try {
    decoded = jwt.verify(challengeToken, config.jwtSecret);
  } catch (_err) {
    throw new AppError("Invalid or expired 2FA challenge", 401);
  }

  if (decoded.purpose !== "2fa_login" || !decoded.id) {
    throw new AppError("Invalid 2FA challenge", 401);
  }

  const user = await User.findById(decoded.id);
  if (!user) throw new AppError("User not found", 404);
  if (!user.twoFactorEnabled || !user.twoFactorMethod) {
    throw new AppError("2FA is not enabled for this account", 400);
  }

  let isValid = false;
  if (user.twoFactorMethod === "totp") {
    if (!user.totpSecretEncrypted || !user.totpSecretIv || !user.totpSecretAuthTag) {
      throw new AppError("2FA is not configured correctly", 400);
    }
    const secret = decryptSecret(
      user.totpSecretEncrypted,
      user.totpSecretIv,
      user.totpSecretAuthTag,
    );
    isValid = speakeasy.totp.verify({
      secret,
      encoding: "base32",
      token: code,
      window: 1,
    });
  } else {
    if (!user.email2faOtpHash || !user.email2faOtpExpiresAt) {
      throw new AppError("Email verification code not requested", 400);
    }
    if (user.email2faOtpExpiresAt < new Date()) {
      throw new AppError("Verification code expired", 400);
    }
    if (user.email2faOtpAttempts >= 5) {
      throw new AppError("Too many invalid attempts. Please request a new code.", 429);
    }
    isValid = await bcrypt.compare(code, user.email2faOtpHash);
    if (!isValid) {
      user.email2faOtpAttempts += 1;
      await user.save();
    }
  }

  if (!isValid) {
    throw new AppError("Invalid 2FA code", 400);
  }

  if (user.twoFactorMethod === "email") {
    user.email2faOtpHash = null;
    user.email2faOtpExpiresAt = null;
    user.email2faOtpAttempts = 0;
  }
  user.twoFactorVerifiedAt = new Date();
  await user.save();

  const accessToken = generateAccessToken(user._id, user.username);
  const refreshToken = generateRefreshToken(user._id, user.username);

  try {
    await redisClient.set(`refresh:${user._id}`, refreshToken, { EX: 30 * 24 * 60 * 60 });
  } catch (err) {
    console.error(" Redis refresh token save error:", err);
  }

  return {
    accessToken,
    refreshToken,
    username: user.username,
    profileImage: user.profileImage,
  };
};

export const sendEmailLogin2FAService = async (challengeToken) => {
  let decoded;
  try {
    decoded = jwt.verify(challengeToken, config.jwtSecret);
  } catch (_err) {
    throw new AppError("Invalid or expired 2FA challenge", 401);
  }

  if (decoded.purpose !== "2fa_login" || !decoded.id) {
    throw new AppError("Invalid 2FA challenge", 401);
  }

  const user = await User.findById(decoded.id);
  if (!user) throw new AppError("User not found", 404);
  if (!user.twoFactorEnabled || user.twoFactorMethod !== "email") {
    throw new AppError("Email-based 2FA is not enabled", 400);
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  user.email2faOtpHash = await bcrypt.hash(otp, 10);
  user.email2faOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
  user.email2faOtpAttempts = 0;
  await user.save();
  await sendOTPEmail(user.email, otp);

  return { message: "2FA verification code sent to your email" };
};

export const disable2FAService = async (userId, password, code) => {
  const user = await User.findById(userId);
  if (!user) throw new AppError("User not found", 404);
  if (!user.twoFactorEnabled) throw new AppError("2FA is already disabled", 400);

  if (code) {
    if (user.twoFactorMethod === "totp") {
      if (!user.totpSecretEncrypted || !user.totpSecretIv || !user.totpSecretAuthTag) {
        throw new AppError("2FA is not configured correctly", 400);
      }
      const secret = decryptSecret(
        user.totpSecretEncrypted,
        user.totpSecretIv,
        user.totpSecretAuthTag,
      );
      const verified = speakeasy.totp.verify({
        secret,
        encoding: "base32",
        token: code,
        window: 1,
      });
      if (!verified) {
        throw new AppError("Invalid 2FA code", 400);
      }
    } else if (user.twoFactorMethod === "email" && user.email2faOtpHash) {
      const verified = await bcrypt.compare(code, user.email2faOtpHash);
      if (!verified) {
        throw new AppError("Invalid 2FA code", 400);
      }
    }
  }

  user.twoFactorEnabled = false;
  user.twoFactorMethod = null;
  user.twoFactorVerifiedAt = null;
  user.totpSecretEncrypted = null;
  user.totpSecretIv = null;
  user.totpSecretAuthTag = null;
  user.totpTempSecretEncrypted = null;
  user.totpTempSecretIv = null;
  user.totpTempSecretAuthTag = null;
  user.email2faOtpHash = null;
  user.email2faOtpExpiresAt = null;
  user.email2faOtpAttempts = 0;
  user.recoveryCodes = [];
  await user.save();

  await PersonalAccessToken.updateMany(
    { userId: user._id, revokedAt: null },
    { $set: { revokedAt: new Date() } },
  );

  return { message: "2FA disabled and all personal access tokens revoked" };
};

export const createPersonalAccessTokenService = async (
  userId,
  name,
  expiresInDays,
  code,
) => {
  const user = await User.findById(userId).select("twoFactorEnabled");
  if (!user) throw new AppError("User not found", 404);
  if (!user.twoFactorEnabled) {
    throw new AppError(
      "Enable two-factor authentication before creating personal access tokens",
      403,
      { code: "2FA_REQUIRED_FOR_PAT" },
    );
  }
  if (!code) {
    throw new AppError(
      "2FA verification code is required to create personal access tokens",
      400,
    );
  }

  const fullUser = await User.findById(userId).select(
    "twoFactorMethod totpSecretEncrypted totpSecretIv totpSecretAuthTag email2faOtpHash email2faOtpExpiresAt email2faOtpAttempts",
  );
  if (!fullUser || !fullUser.twoFactorMethod) {
    throw new AppError("2FA method is not configured", 400);
  }

  let verified = false;
  if (fullUser.twoFactorMethod === "totp") {
    if (
      !fullUser.totpSecretEncrypted ||
      !fullUser.totpSecretIv ||
      !fullUser.totpSecretAuthTag
    ) {
      throw new AppError("TOTP is not configured correctly", 400);
    }
    const secret = decryptSecret(
      fullUser.totpSecretEncrypted,
      fullUser.totpSecretIv,
      fullUser.totpSecretAuthTag,
    );
    verified = speakeasy.totp.verify({
      secret,
      encoding: "base32",
      token: code,
      window: 1,
    });
  } else if (fullUser.twoFactorMethod === "email") {
    if (!fullUser.email2faOtpHash || !fullUser.email2faOtpExpiresAt) {
      throw new AppError(
        "Email 2FA code not available. Request a fresh code and try again.",
        400,
      );
    }
    if (fullUser.email2faOtpExpiresAt < new Date()) {
      throw new AppError("Email 2FA code expired. Request a new code.", 400);
    }
    if (fullUser.email2faOtpAttempts >= 5) {
      throw new AppError("Too many invalid attempts. Request a new code.", 429);
    }
    verified = await bcrypt.compare(code, fullUser.email2faOtpHash);
    if (!verified) {
      fullUser.email2faOtpAttempts += 1;
      await fullUser.save();
    }
  }

  if (!verified) {
    throw new AppError("Invalid 2FA code", 400);
  }

  if (fullUser.twoFactorMethod === "email") {
    fullUser.email2faOtpHash = null;
    fullUser.email2faOtpExpiresAt = null;
    fullUser.email2faOtpAttempts = 0;
    await fullUser.save();
  }

  const tokenId = crypto.randomBytes(6).toString("hex");
  const tokenSecret = crypto.randomBytes(24).toString("hex");
  const token = `dsc_pat_${tokenId}_${tokenSecret}`;
  const tokenHash = hashPAT(token);
  const tokenPrefix = token.slice(0, 18);

  const expiresAt =
    expiresInDays && Number(expiresInDays) > 0
      ? new Date(Date.now() + Number(expiresInDays) * 24 * 60 * 60 * 1000)
      : null;

  const created = await PersonalAccessToken.create({
    userId,
    name,
    tokenHash,
    tokenPrefix,
    scopes: ["mcp:full"],
    expiresAt,
  });

  return {
    token,
    personalAccessToken: {
      id: created._id,
      name: created.name,
      tokenPrefix: created.tokenPrefix,
      scopes: created.scopes,
      createdAt: created.createdAt,
      expiresAt: created.expiresAt,
    },
  };
};

export const listPersonalAccessTokensService = async (userId) => {
  const tokens = await PersonalAccessToken.find({ userId, revokedAt: null })
    .sort({ createdAt: -1 })
    .select("_id name tokenPrefix scopes createdAt expiresAt lastUsedAt");
  return tokens;
};

export const revokePersonalAccessTokenService = async (userId, tokenId) => {
  const token = await PersonalAccessToken.findOneAndUpdate(
    {
      _id: tokenId,
      userId,
      revokedAt: null,
    },
    {
      $set: { revokedAt: new Date() },
    },
    { new: true },
  );

  if (!token) {
    throw new AppError("Personal access token not found", 404);
  }
  return { message: "Personal access token revoked successfully" };
};