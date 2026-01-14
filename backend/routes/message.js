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
  getGroupMessages 
} from "../controllers/message.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// 1. (Get conversations/messages)
router.get("/conversations", verifyToken, getUserConversations);
router.get("/pinned", verifyToken, getPinnedConversations);
router.get("/archived", verifyToken, getArchivedConversations); 
router.get("/group/:groupId", verifyToken, getGroupMessages); 

router.post("/conversation", verifyToken, getOrCreateConversation);
router.post("/messages/bulk-delete", verifyToken, bulkDeleteMessages);

// 3. (Pin/Archive actions)
router.post("/conversation/:conversationId/pin", verifyToken, pinConversation);
router.delete("/conversation/:conversationId/unpin", verifyToken, unpinConversation);
router.post("/conversation/:conversationId/archive", verifyToken, archiveConversation);
router.delete("/conversation/:conversationId/unarchive", verifyToken, unarchiveConversation);

// 4. Specific action routes FIRST
router.delete("/conversation/:conversationId/clear", verifyToken, clearChat);  // Clear messages only
router.delete("/conversation/:conversationId/delete", verifyToken, deleteConversation);  // Delete entire conversation

// 5. Message deletion routes
router.delete("/message/:messageId/for-me", verifyToken, deleteMessageForMe);
router.delete("/message/:messageId/for-everyone", verifyToken, deleteMessageForEveryone);

// 6. Get messages route 
router.get("/:conversationId", verifyToken, getMessages);
export default router;