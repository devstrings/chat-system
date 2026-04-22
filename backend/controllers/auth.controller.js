import { authService } from "#services";
import { redisClient } from "#config/redis";
import asyncHandler from "express-async-handler";
import AppError from "#shared/AppError";
// REGISTER CONTROLLER
export const register = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;
  const user = await authService.registerUser(username, email, password);
  res.status(201).json({ message: "User registered successfully", user });
});

// LOGIN CONTROLLER
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.loginUser(email, password);
  res.json({ message: "Login successful", ...result });
});

// GOOGLE CALLBACK CONTROLLER

export const googleCallback = asyncHandler(async (req, res) => {
  const { code } = req.body;
  if (!code) throw new AppError("Google code is required", 400);
  const result = await authService.handleGoogleAuth(code);
  res.json(result);
});
// FACEBOOK CALLBACK CONTROLLER
export const facebookCallback = asyncHandler(async (req, res) => {
  const { accessToken } = req.body;
  if (!accessToken) throw new AppError("Facebook token is required", 400);
  const result = await authService.handleFacebookAuth(accessToken);
  res.json(result);
});

// FORGOT PASSWORD CONTROLLER
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const result = await authService.processForgotPassword(email);
  res.json({
    message: result.message,
    ...(result.resetUrl && {
      resetUrl: result.resetUrl,
      expiresIn: result.expiresIn,
    }),
  });
});

// RESET PASSWORD CONTROLLER
export const resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;
  const result = await authService.processResetPassword(token, newPassword);
  res.json(result);
});

// SET PASSWORD CONTROLLER
export const setPassword = asyncHandler(async (req, res) => {
  const { newPassword } = req.body;
  const userId = req.user.id || req.user.userId;
  const result = await authService.setUserPassword(userId, newPassword);
  res.json(result);
});

// GET CURRENT USER CONTROLLER
export const getCurrentUser = asyncHandler(async (req, res) => {
  const userId = req.user.id || req.user.userId;
  const userData = await authService.fetchCurrentUser(userId);
  res.json(userData);
});

// CHANGE PASSWORD CONTROLLER
export const changePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const userId = req.user.id;
  const result = await authService.changeUserPassword(
    userId,
    oldPassword,
    newPassword,
  );
  res.json(result);
});

// REFRESH TOKEN CONTROLLER
export const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  const result = await authService.refreshAccessToken(refreshToken);
  res.json(result);
});
// LOGOUT CONTROLLER
export const logout = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  await redisClient.del(`refresh:${userId}`);
  res.json({ message: "Logged out successfully" });
});
// VERIFY OTP CONTROLLER
export const verifyOTP = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  const result = await authService.verifyOTPService(email, otp);
  res.json(result);
});
// RESEND OTP CONTROLLER
export const resendOTP = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const result = await authService.resendOTPService(email);
  res.json(result);
});

// UPDATE PUBLIC KEY CONTROLLER
export const updatePublicKey = asyncHandler(async (req, res) => {
  const { publicKey } = req.body;
  const userId = req.user.id || req.user.userId;
  const result = await authService.updatePublicKeyService(userId, publicKey);
  res.json(result);
});

export const get2FAStatus = asyncHandler(async (req, res) => {
  const userId = req.user.id || req.user.userId;
  const result = await authService.get2FAStatusService(userId);
  res.json(result);
});

export const startTOTPSetup = asyncHandler(async (req, res) => {
  const userId = req.user.id || req.user.userId;
  const result = await authService.startTOTPSetupService(userId);
  res.json(result);
});

export const verifyTOTPSetup = asyncHandler(async (req, res) => {
  const userId = req.user.id || req.user.userId;
  const { code } = req.body;
  const result = await authService.verifyTOTPSetupService(userId, code);
  res.json(result);
});

export const startEmail2FASetup = asyncHandler(async (req, res) => {
  const userId = req.user.id || req.user.userId;
  const result = await authService.startEmail2FASetupService(userId);
  res.json(result);
});

export const verifyEmail2FASetup = asyncHandler(async (req, res) => {
  const userId = req.user.id || req.user.userId;
  const { code } = req.body;
  const result = await authService.verifyEmail2FASetupService(userId, code);
  res.json(result);
});

export const verifyLogin2FA = asyncHandler(async (req, res) => {
  const { challengeToken, code } = req.body;
  const result = await authService.verifyLogin2FAService(challengeToken, code);
  res.json({ message: "Login successful", ...result });
});

export const sendEmailLogin2FA = asyncHandler(async (req, res) => {
  const { challengeToken } = req.body;
  const result = await authService.sendEmailLogin2FAService(challengeToken);
  res.json(result);
});

export const disable2FA = asyncHandler(async (req, res) => {
  const userId = req.user.id || req.user.userId;
  const { password, code } = req.body;
  const result = await authService.disable2FAService(userId, password, code);
  res.json(result);
});

export const createPersonalAccessToken = asyncHandler(async (req, res) => {
  const userId = req.user.id || req.user.userId;
  const { name, expiresInDays, code } = req.body;
  const result = await authService.createPersonalAccessTokenService(
    userId,
    name,
    expiresInDays,
    code,
  );
  res.status(201).json(result);
});

export const listPersonalAccessTokens = asyncHandler(async (req, res) => {
  const userId = req.user.id || req.user.userId;
  const result = await authService.listPersonalAccessTokensService(userId);
  res.json(result);
});

export const revokePersonalAccessToken = asyncHandler(async (req, res) => {
  const userId = req.user.id || req.user.userId;
  const { tokenId } = req.params;
  const result = await authService.revokePersonalAccessTokenService(userId, tokenId);
  res.json(result);
});