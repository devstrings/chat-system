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
} from "../controllers/message.controller.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// 1. Get conversations/messages
router.get("/conversations", verifyToken, getUserConversations);
router.get("/pinned", verifyToken, getPinnedConversations);
router.get("/archived", verifyToken, getArchivedConversations);
router.get("/group/:groupId", verifyToken, getGroupMessages);

router.post("/conversation", verifyToken, getOrCreateConversation);
router.post("/messages/bulk-delete", verifyToken, bulkDeleteMessages);

// 2. Pin/Archive actions
router.post("/conversation/:conversationId/pin", verifyToken, pinConversation);
router.delete(
  "/conversation/:conversationId/unpin",
  verifyToken,
  unpinConversation,
);
router.post(
  "/conversation/:conversationId/archive",
  verifyToken,
  archiveConversation,
);
router.delete(
  "/conversation/:conversationId/unarchive",
  verifyToken,
  unarchiveConversation,
);

// 3. CLEAR vs DELETE - Different methods
router.patch("/conversation/:conversationId/clear", verifyToken, clearChat);
router.delete(
  "/conversation/:conversationId/delete",
  verifyToken,
  deleteConversation,
);

// 4. Message deletion routes
router.delete("/message/:messageId/for-me", verifyToken, deleteMessageForMe);
router.delete(
  "/message/:messageId/for-everyone",
  verifyToken,
  deleteMessageForEveryone,
);

// 5. Get messages route (keep at end)
router.get("/:conversationId", verifyToken, getMessages);

export default router;
