import express from "express";
import {
  getOrCreateConversation,
  getMessages,
  getUserConversations,
  clearChat,
  deleteConversation,
  deleteMessageForMe,
  deleteMessageForEveryone,
  bulkDeleteMessages,
  pinConversation,
  unpinConversation,
  getPinnedConversations,
  archiveConversation,
  unarchiveConversation,
  getArchivedConversations,
  getGroupMessages,
   editMessage
} from "../controllers/message.controller.js";
import Conversation from "../models/Conversation.js";
import { verifyToken } from "../middleware/authMiddleware.js";
const router = express.Router();

/**
 * @swagger
 * /messages/conversations:
 *   get:
 *     summary: Get all conversations of the user
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of conversations
 */
router.get("/conversations", verifyToken, getUserConversations);

/**
 * @swagger
 * /messages/pinned:
 *   get:
 *     summary: Get pinned conversations
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of pinned conversations
 */
router.get("/pinned", verifyToken, getPinnedConversations);

/**
 * @swagger
 * /messages/archived:
 *   get:
 *     summary: Get archived conversations
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of archived conversations
 */
router.get("/archived", verifyToken, getArchivedConversations);
/**
 * @swagger
 * /messages/conversation/{conversationId}/exists:
 *   get:
 *     summary: Check if conversation exists
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Conversation ID
 *     responses:
 *       200:
 *         description: Returns whether conversation exists
 */
router.get("/conversation/:conversationId/exists", verifyToken, async (req, res) => {
  try {
    const Conversation = (await import("../models/Conversation.js")).default;
    const { conversationId } = req.params;
    const conversation = await Conversation.findById(conversationId);
    
    res.json({ exists: !!conversation });
  } catch (err) {
    res.json({ exists: false });
  }
});
/**
 * @swagger
 * /messages/group/{groupId}:
 *   get:
 *     summary: Get messages of a group
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *         description: Group ID
 *     responses:
 *       200:
 *         description: List of group messages
 */
router.get("/group/:groupId", verifyToken, getGroupMessages);

/**
 * @swagger
 * /messages/conversation:
 *   post:
 *     summary: Get or create a conversation
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *                 description: User ID to chat with
 *     responses:
 *       200:
 *         description: Conversation created or retrieved
 */
router.post("/conversation", verifyToken, getOrCreateConversation);

/**
 * @swagger
 * /messages/messages/bulk-delete:
 *   post:
 *     summary: Bulk delete messages
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               messageIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Messages deleted successfully
 */
router.post("/messages/bulk-delete", verifyToken, bulkDeleteMessages);
/**
 * @swagger
 * /messages/message/{messageId}/edit:
 *   patch:
 *     summary: Edit a message
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *         description: Message ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               text:
 *                 type: string
 *     responses:
 *       200:
 *         description: Message edited successfully
 */
router.patch("/message/:messageId/edit", verifyToken, editMessage);
/**
 * @swagger
 * /messages/conversation/{conversationId}/pin:
 *   post:
 *     summary: Pin a conversation
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Conversation ID
 *     responses:
 *       200:
 *         description: Conversation pinned
 */
router.post("/conversation/:conversationId/pin", verifyToken, pinConversation);

/**
 * @swagger
 * /messages/conversation/{conversationId}/unpin:
 *   delete:
 *     summary: Unpin a conversation
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Conversation ID
 *     responses:
 *       200:
 *         description: Conversation unpinned
 */
router.delete("/conversation/:conversationId/unpin", verifyToken, unpinConversation);

/**
 * @swagger
 * /messages/conversation/{conversationId}/archive:
 *   post:
 *     summary: Archive a conversation
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Conversation ID
 *     responses:
 *       200:
 *         description: Conversation archived
 */
router.post("/conversation/:conversationId/archive", verifyToken, archiveConversation);

/**
 * @swagger
 * /messages/conversation/{conversationId}/unarchive:
 *   delete:
 *     summary: Unarchive a conversation
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Conversation ID
 *     responses:
 *       200:
 *         description: Conversation unarchived
 */
router.delete("/conversation/:conversationId/unarchive", verifyToken, unarchiveConversation);

/**
 * @swagger
 * /messages/conversation/{conversationId}/clear:
 *   patch:
 *     summary: Clear a conversation
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Conversation ID
 *     responses:
 *       200:
 *         description: Conversation cleared
 */
router.patch("/conversation/:conversationId/clear", verifyToken, clearChat);

/**
 * @swagger
 * /messages/conversation/{conversationId}/delete:
 *   delete:
 *     summary: Delete a conversation
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Conversation ID
 *     responses:
 *       200:
 *         description: Conversation deleted
 */
router.delete("/conversation/:conversationId/delete", verifyToken, deleteConversation);

/**
 * @swagger
 * /messages/message/{messageId}/for-me:
 *   delete:
 *     summary: Delete a message for me
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *         description: Message ID
 *     responses:
 *       200:
 *         description: Message deleted for current user
 */
router.delete("/message/:messageId/for-me", verifyToken, deleteMessageForMe);

/**
 * @swagger
 * /messages/message/{messageId}/for-everyone:
 *   delete:
 *     summary: Delete a message for everyone
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *         description: Message ID
 *     responses:
 *       200:
 *         description: Message deleted for everyone
 */
router.delete("/message/:messageId/for-everyone", verifyToken, deleteMessageForEveryone);

/**
 * @swagger
 * /messages/{conversationId}:
 *   get:
 *     summary: Get messages for a conversation
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Conversation ID
 *     responses:
 *       200:
 *         description: List of messages
 */
router.get("/:conversationId", verifyToken, getMessages);

export default router;
