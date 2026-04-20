import express from "express";
import {
  register,
  login,
  logout,
  googleCallback,
  facebookCallback,
  forgotPassword,
  resetPassword,
  setPassword,
  changePassword,
  getCurrentUser,
  refreshToken,
  verifyOTP,
  resendOTP,
  updatePublicKey,
} from "#controllers/auth.controller";
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
} from "#validators";

const router = express.Router();

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 */
router.post("/register", registerValidation, validate, register);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login a user
 *     tags: [Auth]
 */
router.post("/login", loginValidation, validate, login);

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
router.post("/logout", verifyToken, logout);
/**
 * @swagger
 * /auth/refresh-token:
 *   post:
 *     summary: Refresh JWT token
 *     tags: [Auth]
 */
router.post("/refresh-token", refreshTokenValidation, validate, refreshToken);

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
  forgotPassword,
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
  resetPassword,
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
  setPassword,
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
  changePassword,
);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current authenticated user
 *     tags: [Auth]
 */
router.get("/me", verifyToken, getCurrentUser);

router.post("/google", googleCallback);
router.post("/facebook", facebookCallback);
router.post("/verify-otp", verifyOTP);
router.post("/resend-otp", resendOTP);
router.post("/public-key", verifyToken, updatePublicKey);

export default router;
