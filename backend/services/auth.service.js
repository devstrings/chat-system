import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import AuthProvider from "../models/AuthProvider.js";
import config from "../config/index.js";
import crypto from "crypto";
import { redisClient } from "../config/redis.js";
import AppError from "../shared/AppError.js";
import axios from "axios";
import { OAuth2Client } from "google-auth-library";
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

  console.log(" User registered:", email);

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
    console.log(" Auto-creating local provider for:", email);

    localProvider = await AuthProvider.create({
      userId: user._id,
      provider: "local",
    });

    console.log(" Local provider auto-created");
  }

  if (!localProvider) {
    throw new AppError(
      "This account was created with Google or Facebook. Please use social login.",
      400,
    );
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new AppError("Invalid email or password", 401);
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

  console.log(" User logged in:", email);

  return {
    accessToken,
    refreshToken,
    username: user.username,
    profileImage: user.profileImage,
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

      if (!user.profileImage && picture) {
        user.profileImage = picture;
        await user.save();
      }
    }
  } else {
    let username = name || `user_${Date.now()}`;
    const existingUsername = await User.findOne({ username });
    if (existingUsername) username = `${username}_${Date.now()}`;

    user = await User.create({ email, username, profileImage: picture });

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

      if (!user.profileImage && picture) {
        user.profileImage = picture;
        await user.save();
      }
    }
  } else {
    let username = name || `user_${Date.now()}`;
    const existingUsername = await User.findOne({ username });
    if (existingUsername) username = `${username}_${Date.now()}`;

    user = await User.create({ email, username, profileImage: picture });

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

  //  CONSOLE LOGGING
  console.log("\n" + "=".repeat(80));
  console.log(" PASSWORD RESET REQUEST");
  console.log("=".repeat(80));
  console.log(" User Email:", user.email);
  console.log(" Username:", user.username);
  console.log(" Reset Link:");
  console.log(resetUrl);
  console.log(" Expires in:", config.resetToken.expiryMinutes, "minutes");
  console.log("=".repeat(80) + "\n");

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

  console.log(" Password reset successful for:", user.email);

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

  console.log(" Password set for SSO user:", user.email);

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

  // : Console log for debugging
  console.log(" User Check:", {
    email: user.email,
    hasPasswordInDB: hasPassword,
    passwordField: user.password ? "EXISTS" : "NULL",
    hasLocalAuth,
    primaryProvider,
  });

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

  console.log(" Password changed for:", user.email);

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
  console.log("Token refreshed for user:", decoded.username);
  return { accessToken: newAccessToken };
};
