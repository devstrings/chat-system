import { body, param } from "express-validator";

// GET OR CREATE CONVERSATION VALIDATION
export const getOrCreateConversationValidation = [
  body("otherUserId").notEmpty().withMessage("Other user ID is required"),
];

// SEND MESSAGE VALIDATION
export const sendMessageValidation = [
  body("conversationId").notEmpty().withMessage("Conversation ID is required"),
];

// EDIT MESSAGE VALIDATION
export const editMessageValidation = [
  body("text").notEmpty().withMessage("Message text is required"),
];

// BULK DELETE VALIDATION
export const bulkDeleteValidation = [
  body("messageIds")
    .isArray({ min: 1 })
    .withMessage("Message IDs array is required"),
];