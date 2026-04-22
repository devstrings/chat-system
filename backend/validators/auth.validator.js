import { body } from "express-validator";

// REGISTER VALIDATION
export const registerValidation = [
  body("username").notEmpty().withMessage("Username is required"),
  body("email").isEmail().withMessage("Valid email is required"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
];

// LOGIN VALIDATION
export const loginValidation = [
  body("email").isEmail().withMessage("Valid email is required"),
  body("password").notEmpty().withMessage("Password is required"),
];

// REFRESH TOKEN VALIDATION
export const refreshTokenValidation = [
  body("refreshToken").notEmpty().withMessage("Refresh token is required"),
];

// FORGOT PASSWORD VALIDATION
export const forgotPasswordValidation = [
  body("email").isEmail().withMessage("Valid email is required"),
];

// RESET PASSWORD VALIDATION
export const resetPasswordValidation = [
  body("token").notEmpty().withMessage("Token is required"),
  body("newPassword")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
];

// SET PASSWORD VALIDATION
export const setPasswordValidation = [
  body("newPassword")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
];

// CHANGE PASSWORD VALIDATION
export const changePasswordValidation = [
  body("oldPassword").notEmpty().withMessage("Old password is required"),
  body("newPassword")
    .isLength({ min: 6 })
    .withMessage("New password must be at least 6 characters"),
];

export const codeValidation = [
  body("code")
    .notEmpty()
    .withMessage("Code is required")
    .isLength({ min: 6, max: 8 })
    .withMessage("Code must be 6 to 8 characters"),
];

export const login2faValidation = [
  body("challengeToken").notEmpty().withMessage("Challenge token is required"),
  ...codeValidation,
];

export const challengeTokenValidation = [
  body("challengeToken").notEmpty().withMessage("Challenge token is required"),
];

export const disable2faValidation = [
  body("password")
    .optional()
    .isString()
    .withMessage("Password must be a string"),
  body("code")
    .optional()
    .isLength({ min: 6, max: 8 })
    .withMessage("Code must be 6 to 8 characters"),
];

export const createPatValidation = [
  body("name")
    .notEmpty()
    .withMessage("Token name is required")
    .isLength({ max: 100 })
    .withMessage("Token name must be less than 100 characters"),
  body("code")
    .notEmpty()
    .withMessage("2FA code is required to create personal access tokens")
    .isLength({ min: 6, max: 8 })
    .withMessage("Code must be 6 to 8 characters"),
  body("expiresInDays")
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage("expiresInDays must be between 1 and 365"),
];
