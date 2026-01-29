import express from "express";
import {
  createStatus,
  getStatuses,
  getUserStatuses,
  markAsViewed,
  deleteStatus,
  getStatusViewers,
  updateStatusPrivacy,
} from "../controllers/status.controller.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { uploadStatus } from "../config/multer.js";

const router = express.Router();

// Create new status (with file upload for image/video)
router.post("/", verifyToken, uploadStatus.single("file"), createStatus);

// Get all statuses from friends
router.get("/", verifyToken, getStatuses);

// Get specific user's statuses
router.get("/user/:userId", verifyToken, getUserStatuses);

// Mark status as viewed
router.post("/:statusId/view", verifyToken, markAsViewed);

// Delete status
router.delete("/:statusId", verifyToken, deleteStatus);

// Get status viewers (only for owner)
router.get("/:statusId/viewers", verifyToken, getStatusViewers);

// Update privacy settings
// Update privacy settings
router.put("/privacy", verifyToken, updateStatusPrivacy);

// TEMPORARY - Testing friendship creation
router.post("/test/create-friendship", verifyToken, async (req, res) => {
  try {
    const Friendship = (await import("../models/Friendship.js")).default;
    const { friendId } = req.body;
    const userId = req.user.id;

    // Check if already exists
  const existing = await Friendship.findOne({
  $or: [
    { user1: userId, user2: friendId },
    { user1: friendId, user2: userId }
  ]
});

    if (existing) {
      return res.json({ 
        message: "Friendship already exists", 
        friendship: existing 
      });
    }

    // Create new friendship
  const friendship = new Friendship({
  user1: userId,
  user2: friendId
});

    await friendship.save();
    res.json({ message: "Friendship created!", friendship });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;