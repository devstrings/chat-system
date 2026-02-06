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

/**
 * @swagger
 * /status:
 *   post:
 *     summary: Create new status (image/video)
 *     tags: [Status]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Status created successfully
 */
router.post("/", verifyToken, uploadStatus.single("file"), createStatus);

/**
 * @swagger
 * /status:
 *   get:
 *     summary: Get all statuses from friends
 *     tags: [Status]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of statuses
 */
router.get("/", verifyToken, getStatuses);

/**
 * @swagger
 * /status/user/{userId}:
 *   get:
 *     summary: Get statuses of a specific user
 *     tags: [Status]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: List of user's statuses
 */
router.get("/user/:userId", verifyToken, getUserStatuses);

/**
 * @swagger
 * /status/{statusId}/view:
 *   post:
 *     summary: Mark status as viewed
 *     tags: [Status]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: statusId
 *         required: true
 *         schema:
 *           type: string
 *         description: Status ID
 *     responses:
 *       200:
 *         description: Status marked as viewed
 */
router.post("/:statusId/view", verifyToken, markAsViewed);

/**
 * @swagger
 * /status/{statusId}:
 *   delete:
 *     summary: Delete a status
 *     tags: [Status]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: statusId
 *         required: true
 *         schema:
 *           type: string
 *         description: Status ID
 *     responses:
 *       200:
 *         description: Status deleted successfully
 */
router.delete("/:statusId", verifyToken, deleteStatus);

/**
 * @swagger
 * /status/{statusId}/viewers:
 *   get:
 *     summary: Get viewers of a status (only for owner)
 *     tags: [Status]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: statusId
 *         required: true
 *         schema:
 *           type: string
 *         description: Status ID
 *     responses:
 *       200:
 *         description: List of viewers
 */
router.get("/:statusId/viewers", verifyToken, getStatusViewers);

/**
 * @swagger
 * /status/privacy:
 *   put:
 *     summary: Update status privacy settings
 *     tags: [Status]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               statusId:
 *                 type: string
 *               privacy:
 *                 type: string
 *                 enum: [public, friends, private]
 *     responses:
 *       200:
 *         description: Privacy updated successfully
 */
router.put("/privacy", verifyToken, updateStatusPrivacy);

/**
 * @swagger
 * /status/test/create-friendship:
 *   post:
 *     summary: TEMP - Create friendship (for testing)
 *     tags: [Status]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               friendId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Friendship created successfully
 */
router.post("/test/create-friendship", verifyToken, async (req, res) => {
  try {
    const Friendship = (await import("../models/Friendship.js")).default;
    const { friendId } = req.body;
    const userId = req.user.id;

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
