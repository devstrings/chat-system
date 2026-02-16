import { body, param } from "express-validator";

// UPLOAD FILE VALIDATION
export const uploadFileValidation = [
  body("conversationId")
    .notEmpty()
    .withMessage("Conversation ID is required"),
];

// DOWNLOAD FILE VALIDATION
export const downloadFileValidation = [
  param("filename")
    .notEmpty()
    .withMessage("Filename is required")
    .not()
    .contains("..")
    .withMessage("Invalid filename")
    .not()
    .contains("/")
    .withMessage("Invalid filename")
    .not()
    .contains("\\")
    .withMessage("Invalid filename"),
];