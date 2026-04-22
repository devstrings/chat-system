import express from "express";
import { authController } from "#controllers";
import { verifyToken } from "#middleware/authMiddleware";
import { validate } from "#middleware/validate";
import {
  registerValidation,
  loginValidation,
  refreshTokenValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  setPasswordValidation,
  changePasswordValidation,
  codeValidation,
  login2faValidation,
  challengeTokenValidation,
  disable2faValidation,
  createPatValidation,
} from "#validators";

const router = express.Router();

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 */
router.post("/register", registerValidation, validate, authController.register);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login a user
 *     tags: [Auth]
 */
router.post("/login", loginValidation, validate, authController.login);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout user and invalidate refresh token
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Logout failed
 */
router.post("/logout", verifyToken, authController.logout);
/**
 * @swagger
 * /auth/refresh-token:
 *   post:
 *     summary: Refresh JWT token
 *     tags: [Auth]
 */
router.post("/refresh-token", refreshTokenValidation, validate, authController.refreshToken);

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     summary: Request password reset
 *     tags: [Auth]
 */
router.post(
  "/forgot-password",
  forgotPasswordValidation,
  validate,
  authController.forgotPassword,
);

/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     summary: Reset password using token
 *     tags: [Auth]
 */
router.post(
  "/reset-password",
  resetPasswordValidation,
  validate,
  authController.resetPassword,
);

/**
 * @swagger
 * /auth/set-password:
 *   post:
 *     summary: Set password for authenticated user
 *     tags: [Auth]
 */
router.post(
  "/set-password",
  verifyToken,
  setPasswordValidation,
  validate,
  authController.setPassword,
);

/**
 * @swagger
 * /auth/change-password:
 *   post:
 *     summary: Change password for authenticated user
 *     tags: [Auth]
 */
router.post(
  "/change-password",
  verifyToken,
  changePasswordValidation,
  validate,
  authController.changePassword,
);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current authenticated user
 *     tags: [Auth]
 */
router.get("/me", verifyToken, authController.getCurrentUser);

router.post("/google", authController.googleCallback);
router.post("/facebook", authController.facebookCallback);
router.post("/verify-otp", authController.verifyOTP);
router.post("/resend-otp", authController.resendOTP);
router.post("/public-key", verifyToken, authController.updatePublicKey);
router.get("/2fa/status", verifyToken, authController.get2FAStatus);
router.post("/2fa/totp/setup/start", verifyToken, authController.startTOTPSetup);
router.post(
  "/2fa/totp/setup/verify",
  verifyToken,
  codeValidation,
  validate,
  authController.verifyTOTPSetup,
);
router.post(
  "/2fa/email/setup/start",
  verifyToken,
  authController.startEmail2FASetup,
);
router.post(
  "/2fa/email/setup/verify",
  verifyToken,
  codeValidation,
  validate,
  authController.verifyEmail2FASetup,
);
router.post("/2fa/login/verify", login2faValidation, validate, authController.verifyLogin2FA);
router.post(
  "/2fa/login/email/send",
  challengeTokenValidation,
  validate,
  authController.sendEmailLogin2FA,
);
router.post(
  "/2fa/disable",
  verifyToken,
  disable2faValidation,
  validate,
  authController.disable2FA,
);
router.post(
  "/personal-access-tokens",
  verifyToken,
  createPatValidation,
  validate,
  authController.createPersonalAccessToken,
);
router.get(
  "/personal-access-tokens",
  verifyToken,
  authController.listPersonalAccessTokens,
);
router.delete(
  "/personal-access-tokens/:tokenId",
  verifyToken,
  authController.revokePersonalAccessToken,
);

export default router;
