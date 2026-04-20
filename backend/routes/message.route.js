import express from "express";
import rateLimit from "express-rate-limit";
import { messageController } from "#controllers";
import { verifyToken } from "#middleware/authMiddleware";
import { validate } from "#middleware/validate";
import {
  getOrCreateConversationValidation,
  sendMessageValidation,
  editMessageValidation,
  bulkDeleteValidation,
} from "#validators";
import {
  validateFriendship,
  validateConversationExists,
  validateConversationParticipant,
  validateMessageContent,
  validateConversationPinLimit,
  validateConversationArchive,
  validateMessageExists,
  validateMessageSender,
  validateMessageEditTime,
  validateMessageDeleteTime,
  validateMessageParticipant,
  validateBulkMessageIds,
  validateGroupExists,
  validateGroupMember,
} from "#middleware/validation.middleware";

const router = express.Router();

const messageLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // 60 messages per minute
  message: "Too many messages, slow down!",
});


/**
 * @swagger
 * /messages/conversations:
 *   get:
 *     summary: Get all conversations of the user
 *     tags: [Messages]
 */
router.get("/conversations", verifyToken, messageController.getUserConversations);

/**
 * @swagger
 * /messages/pinned:
 *   get:
 *     summary: Get pinned conversations
 *     tags: [Messages]
 */
router.get("/pinned", verifyToken, messageController.getPinnedConversations);

/**
 * @swagger
 * /messages/archived:
 *   get:
 *     summary: Get archived conversations
 *     tags: [Messages]
 */
router.get("/archived", verifyToken, messageController.getArchivedConversations);

/**
 * @swagger
 * /messages/conversation/{conversationId}/exists:
 *   get:
 *     summary: Check if conversation exists
 *     tags: [Messages]
 */
router.get(
  "/conversation/:conversationId/exists",
  verifyToken,
  messageController.checkConversationExists
);

/**
 * @swagger
 * /messages/group/{groupId}:
 *   get:
 *     summary: Get messages of a group
 *     tags: [Messages]
 */
router.get(
  "/group/:groupId",
  verifyToken,
  validateGroupExists,
  validateGroupMember,
  messageController.getGroupMessages
);

/**
 * @swagger
 * /messages/group/{groupId}/send:
 *   post:
 *     summary: Send a message to a group
 *     tags: [Messages]
 */
router.post(
  "/group/:groupId/send",
  messageLimiter,
  verifyToken,
  validateGroupExists,
  validateGroupMember,
  validateMessageContent,
  messageController.sendGroupMessage
);

/**
 * @swagger
 * /messages/conversation:
 *   post:
 *     summary: Get or create a conversation
 *     tags: [Messages]
 */
router.post(
  "/conversation",
  verifyToken,
  getOrCreateConversationValidation,
  validate,
  validateFriendship,
  messageController.getOrCreateConversation
);

// Middleware that skips conversation validation for group messages
const conditionalConversationExists = (req, res, next) => {
  if (req.body.groupId) return next();
  return validateConversationExists(req, res, next);
};
const conditionalConversationParticipant = (req, res, next) => {
  if (req.body.groupId) return next();
  return validateConversationParticipant(req, res, next);
};

/**
 * @swagger
 * /messages/send:
 *   post:
 *     summary: Send a message (individual or group)
 *     tags: [Messages]
 */
router.post(
  "/send",
  messageLimiter,
  verifyToken,
  conditionalConversationExists,
  conditionalConversationParticipant,
  validateMessageContent,
  messageController.sendMessage
);

/**
 * @swagger
 * /messages/messages/bulk-delete:
 *   post:
 *     summary: Bulk delete messages
 *     tags: [Messages]
 */
router.post(
  "/messages/bulk-delete",
  verifyToken,
  bulkDeleteValidation,
  validate,
  validateBulkMessageIds,
  messageController.bulkDeleteMessages
);

/**
 * @swagger
 * /messages/message/{messageId}/edit:
 *   patch:
 *     summary: Edit a message
 *     tags: [Messages]
 */
router.patch(
  "/message/:messageId/edit",
  verifyToken,
  editMessageValidation,
  validate,
  validateMessageExists,
  validateMessageSender,
  validateMessageEditTime,
  messageController.editMessage
);

/**
 * @swagger
 * /messages/conversation/{conversationId}/pin:
 *   post:
 *     summary: Pin a conversation
 *     tags: [Messages]
 */
router.post(
  "/conversation/:conversationId/pin",
  verifyToken,
  validateConversationExists,
  validateConversationParticipant,
  validateConversationPinLimit,
  messageController.pinConversation
);

/**
 * @swagger
 * /messages/conversation/{conversationId}/unpin:
 *   delete:
 *     summary: Unpin a conversation
 *     tags: [Messages]
 */
router.delete(
  "/conversation/:conversationId/unpin",
  verifyToken,
  validateConversationExists,
  messageController.unpinConversation
);

/**
 * @swagger
 * /messages/conversation/{conversationId}/archive:
 *   post:
 *     summary: Archive a conversation
 *     tags: [Messages]
 */
router.post(
  "/conversation/:conversationId/archive",
  verifyToken,
  validateConversationExists,
  validateConversationParticipant,
  validateConversationArchive,
  messageController.archiveConversation
);

/**
 * @swagger
 * /messages/conversation/{conversationId}/unarchive:
 *   delete:
 *     summary: Unarchive a conversation
 *     tags: [Messages]
 */
router.delete(
  "/conversation/:conversationId/unarchive",
  verifyToken,
  validateConversationExists,
  messageController.unarchiveConversation
);

/**
 * @swagger
 * /messages/conversation/{conversationId}/clear:
 *   patch:
 *     summary: Clear a conversation
 *     tags: [Messages]
 */
router.patch(
  "/conversation/:conversationId/clear",
  verifyToken,
  validateConversationExists,
  validateConversationParticipant,
  messageController.clearChat
);

/**
 * @swagger
 * /messages/conversation/{conversationId}/delete:
 *   delete:
 *     summary: Delete a conversation
 *     tags: [Messages]
 */
router.delete(
  "/conversation/:conversationId/delete",
  verifyToken,
  messageController.deleteConversation
);

/**
 * @swagger
 * /messages/message/{messageId}/for-me:
 *   delete:
 *     summary: Delete a message for me
 *     tags: [Messages]
 */
router.delete(
  "/message/:messageId/for-me",
  verifyToken,
  validateMessageExists,
  validateMessageParticipant,
  messageController.deleteMessageForMe
);

/**
 * @swagger
 * /messages/message/{messageId}/for-everyone:
 *   delete:
 *     summary: Delete a message for everyone
 *     tags: [Messages]
 */
router.delete(
  "/message/:messageId/for-everyone",
  verifyToken,
  validateMessageExists,
  validateMessageSender,
  validateMessageDeleteTime,
  messageController.deleteMessageForEveryone
);

/**
 * @swagger
 * /messages/{conversationId}:
 *   get:
 *     summary: Get messages for a conversation
 *     tags: [Messages]
 */
router.get(
  "/:conversationId",
  verifyToken,
  validateConversationExists,
  validateConversationParticipant,
  messageController.getMessages
);

export default router;