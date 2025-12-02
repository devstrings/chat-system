import express from "express";
import { 
  getOrCreateConversation, 
  getMessages, 
  getUserConversations,
  clearChat,
  deleteMessageForMe,        
  deleteMessageForEveryone,  
  bulkDeleteMessages         
} from "../controllers/messageController.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// Get all conversations for user
router.get("/conversations", verifyToken, getUserConversations);

// Get or create conversation
router.post("/conversation", verifyToken, getOrCreateConversation);

// Clear chat (delete messages) - Must be before /:conversationId
router.delete("/conversation/:conversationId", verifyToken, clearChat);

// Delete message for me
router.delete("/message/:messageId/for-me", verifyToken, deleteMessageForMe);

// Delete message for everyone
router.delete("/message/:messageId/for-everyone", verifyToken, deleteMessageForEveryone);

// Bulk delete messages
router.post("/messages/bulk-delete", verifyToken, bulkDeleteMessages);

// Get messages for a conversation (keep at end)
router.get("/:conversationId", verifyToken, getMessages);

export default router;