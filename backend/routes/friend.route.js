import express from "express";
import {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  getPendingRequests,
  getSentRequests,
  unfriend,
  blockUser,
  unblockUser,
  getBlockedUsers,
  getRelationshipStatus,
  getFriends,
} from "../controllers/friend.controller.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// Friend Requests
router.post("/request/send", verifyToken, sendFriendRequest);
router.post("/request/:requestId/accept", verifyToken, acceptFriendRequest);
router.delete("/request/:requestId/reject", verifyToken, rejectFriendRequest);
router.get("/requests/pending", verifyToken, getPendingRequests);
router.get("/requests/sent", verifyToken, getSentRequests);

// Unfriend
router.delete("/unfriend/:friendId", verifyToken, unfriend);

// Block
router.post("/block", verifyToken, blockUser);
router.delete("/unblock/:userId", verifyToken, unblockUser);
router.get("/blocked", verifyToken, getBlockedUsers);

// Status
router.get("/status/:userId", verifyToken, getRelationshipStatus);
router.get("/list", verifyToken, getFriends);

export default router;
