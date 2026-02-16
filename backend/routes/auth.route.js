import express from "express";
import passport from "../config/passport.js";
import {
  register,
  login,
  googleCallback,
  facebookCallback,
  forgotPassword,
  resetPassword,
  setPassword,
  changePassword,
  getCurrentUser,
  refreshToken,
} from "../controllers/auth.controller.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { validate } from "../validators//middleware/validate.js";
import {
  registerValidation,
  loginValidation,
  refreshTokenValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  setPasswordValidation,
  changePasswordValidation,
} from "../validators/index.js";
import config from "../config/index.js";

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
  forgotPassword
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
  resetPassword
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
  setPassword
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
  changePassword
);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current authenticated user
 *     tags: [Auth]
 */
router.get("/me", verifyToken, getCurrentUser);

/**
 * @swagger
 * /auth/google:
 *   get:
 *     summary: Google OAuth login
 *     tags: [Auth]
 */
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  })
);

/**
 * @swagger
 * /auth/google/callback:
 *   get:
 *     summary: Google OAuth callback
 *     tags: [Auth]
 */
router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: `${config.frontend.loginUrl}?error=google_auth_failed`,
  }),
  googleCallback
);

/**
 * @swagger
 * /auth/facebook:
 *   get:
 *     summary: Facebook OAuth login
 *     tags: [Auth]
 */
router.get(
  "/facebook",
  passport.authenticate("facebook", {
    scope: ["email"],
    session: false,
  })
);

/**
 * @swagger
 * /auth/facebook/callback:
 *   get:
 *     summary: Facebook OAuth callback
 *     tags: [Auth]
 */
router.get(
  "/facebook/callback",
  passport.authenticate("facebook", {
    session: false,
    failureRedirect: `${config.frontend.loginUrl}?error=facebook_auth_failed`,
  }),
  facebookCallback
);

// ERROR HANDLER
router.use((err, req, res, next) => {
  console.error(" OAuth error:", err.message);
  res.redirect(
    `${config.frontend.loginUrl}?error=${encodeURIComponent(err.message)}`
  );
});

export default router;