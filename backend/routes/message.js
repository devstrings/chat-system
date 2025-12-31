import express from "express";
import { 
  getOrCreateConversation, 
  getMessages, 
  getUserConversations,
  clearChat,
  deleteMessageForMe,        
  deleteMessageForEveryone,  
  bulkDeleteMessages,
  pinConversation,        
  unpinConversation,      
  getPinnedConversations, 
} from "../controllers/message.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// Get all conversations for user
router.get("/conversations", verifyToken, getUserConversations);

// Get or create conversation
router.post("/conversation", verifyToken, getOrCreateConversation);

//  Pin routes
router.post("/conversation/:conversationId/pin", verifyToken, pinConversation);
router.delete("/conversation/:conversationId/unpin", verifyToken, unpinConversation);
router.get("/pinned", verifyToken, getPinnedConversations);

// Clear chat (delete messages) - Must be before /:conversationId
router.delete("/conversation/:conversationId", verifyToken, clearChat);

// Delete message for me
router.delete("/message/:messageId/for-me", verifyToken, deleteMessageForMe);

// Delete message for everyone
router.delete("/message/:messageId/for-everyone", verifyToken, deleteMessageForEveryone);

// Bulk delete messages
router.post("/messages/bulk-delete", verifyToken, bulkDeleteMessages);

// Get messages for a conversation 
router.get("/:conversationId", verifyToken, getMessages);

export default router;