
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import AuthProvider from "../models/AuthProvider.js";
import config from "../config/index.js";
import crypto from "crypto";

// Token generation helpers
const generateAccessToken = (userId, username) => {
  return jwt.sign(
    { id: userId, username }, 
    config.jwtSecret, 
    { expiresIn: '15m' }
  );
};

const generateRefreshToken = (userId, username) => {
  return jwt.sign(
    { id: userId, username }, 
    config.jwtSecret, 
    { expiresIn: '30d' }
  );
};

// REGISTER SERVICE
export const registerUser = async (username, email, password) => {
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new Error("Email already registered");
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
    throw new Error("User not found");
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
    throw new Error("This account was created with Google or Facebook. Please use social login.");
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new Error("Invalid email or password");
  }

  // Generate both tokens
  const accessToken = generateAccessToken(user._id, user.username);
  const refreshToken = generateRefreshToken(user._id, user.username);

  console.log(" User logged in:", email);

  return {
    accessToken,
    refreshToken,
    username: user.username,
    profileImage: user.profileImage,
  };
};

// GOOGLE OAUTH SERVICE
export const handleGoogleCallback = (user) => {
  const accessToken = generateAccessToken(user._id, user.username);
  const refreshToken = generateRefreshToken(user._id, user.username);
  const profileImage = user.profileImage || "";

  const redirectUrl = `${config.frontend.callbackUrl}?accessToken=${accessToken}&refreshToken=${refreshToken}&username=${encodeURIComponent(user.username)}&profileImage=${encodeURIComponent(profileImage)}`;

  console.log(" Google OAuth success:", user.email);

  return redirectUrl;
};

// FACEBOOK OAUTH SERVICE
export const handleFacebookCallback = (user) => {
  const accessToken = generateAccessToken(user._id, user.username);
  const refreshToken = generateRefreshToken(user._id, user.username);
  const profileImage = user.profileImage || "";

  const redirectUrl = `${config.frontend.callbackUrl}?accessToken=${accessToken}&refreshToken=${refreshToken}&username=${encodeURIComponent(user.username)}&profileImage=${encodeURIComponent(profileImage)}`;

  console.log(" Facebook OAuth success:", user.email);

  return redirectUrl;
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

  //  CONSOLE LOGGING (instead of email)
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
    expiresIn: config.nodeEnv === "development" ? config.resetToken.expiryMinutes + " minutes" : null,
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
    throw new Error("Invalid or expired reset token");
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
    throw new Error("User not found");
  }

  // Check only if password already exists
  if (user.password) {
    throw new Error("You already have a password. Use 'Change Password' instead.");
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
    throw new Error("User not found");
  }

  // Check password existence properly
  const hasPassword = !!(user.password && user.password.length > 0);

  // Check all auth providers for this user
  const authProviders = await AuthProvider.find({ userId: user._id });

  const hasLocalAuth = authProviders.some((p) => p.provider === "local");
  const hasGoogleAuth = authProviders.some((p) => p.provider === "google");
  const hasFacebookAuth = authProviders.some(
    (p) => p.provider === "facebook",
  );

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
    throw new Error("No password set. Use 'Set Password' first.");
  }

  // Verify old password
  const isMatch = await bcrypt.compare(oldPassword, user.password);
  if (!isMatch) {
    throw new Error("Current password is incorrect");
  }

  // Check if new password is same as old
  const isSamePassword = await bcrypt.compare(newPassword, user.password);
  if (isSamePassword) {
    throw new Error("New password must be different from current password");
  }

  // Hash and update password
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  user.password = hashedPassword;
  await user.save();

  console.log(" Password changed for:", user.email);

  return { message: "Password changed successfully" };
};

// REFRESH TOKEN SERVICE
export const refreshAccessToken = (refreshToken) => {
  // Verify refresh token
  const decoded = jwt.verify(refreshToken, config.jwtSecret);

  // Generate new access token
  const newAccessToken = generateAccessToken(decoded.id, decoded.username);

  console.log("Token refreshed for user:", decoded.username);

  return { accessToken: newAccessToken };
};