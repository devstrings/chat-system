import { body } from "express-validator";

// SEND FRIEND REQUEST VALIDATION
export const sendFriendRequestValidation = [
  body("receiverId").notEmpty().withMessage("Receiver ID is required"),
];

// BLOCK USER VALIDATION
export const blockUserValidation = [
  body("userId").notEmpty().withMessage("User ID is required"),
];