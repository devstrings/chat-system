import express from "express";
import { 
  getOrCreateConversation, 
  getMessages, 
  getUserConversations,
  clearChat
} from "../controllers/messageController.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();



// Get all conversations for user
router.get("/conversations", verifyToken, getUserConversations);

// Get or create conversation
router.post("/conversation", verifyToken, getOrCreateConversation);

// Clear chat (delete messages) - Must be before /:conversationId
router.delete("/conversation/:conversationId", verifyToken, clearChat);

// Get messages for a conversation last
router.get("/:conversationId", verifyToken, getMessages);

export default router;