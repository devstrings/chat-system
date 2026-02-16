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
import { validate } from "../validators/middleware/validate.js";
import { createStatusValidation } from "../validators/index.js";
import {
  validateStatusExists,
  validateStatusOwner,
  validateStatusViewPermission,
} from "../validators/middleware/validation.middleware.js";

const router = express.Router();

/**
 * @swagger
 * /status:
 *   post:
 *     summary: Create new status (image/video)
 *     tags: [Status]
 */
router.post(
  "/",
  verifyToken,
  uploadStatus.single("file"),
  createStatusValidation,
  validate,
  createStatus
);

/**
 * @swagger
 * /status:
 *   get:
 *     summary: Get all statuses from friends
 *     tags: [Status]
 */
router.get("/", verifyToken, getStatuses);

/**
 * @swagger
 * /status/user/{userId}:
 *   get:
 *     summary: Get statuses of a specific user
 *     tags: [Status]
 */
router.get("/user/:userId", verifyToken, getUserStatuses);

/**
 * @swagger
 * /status/{statusId}/view:
 *   post:
 *     summary: Mark status as viewed
 *     tags: [Status]
 */
router.post(
  "/:statusId/view",
  verifyToken,
  validateStatusExists,
  validateStatusViewPermission,
  markAsViewed
);

/**
 * @swagger
 * /status/{statusId}:
 *   delete:
 *     summary: Delete a status
 *     tags: [Status]
 */
router.delete(
  "/:statusId",
  verifyToken,
  validateStatusExists,
  validateStatusOwner,
  deleteStatus
);

/**
 * @swagger
 * /status/{statusId}/viewers:
 *   get:
 *     summary: Get viewers of a status (only for owner)
 *     tags: [Status]
 */
router.get(
  "/:statusId/viewers",
  verifyToken,
  validateStatusExists,
  validateStatusOwner,
  getStatusViewers
);

/**
 * @swagger
 * /status/privacy:
 *   put:
 *     summary: Update status privacy settings
 *     tags: [Status]
 */
router.put("/privacy", verifyToken, updateStatusPrivacy);

/**
 * @swagger
 * /status/test/create-friendship:
 *   post:
 *     summary: TEMP - Create friendship (for testing)
 *     tags: [Status]
 */
router.post("/test/create-friendship", verifyToken, async (req, res) => {
  try {
    const Friendship = (await import("../models/Friendship.js")).default;
    const { friendId } = req.body;
    const userId = req.user.id;

    const existing = await Friendship.findOne({
      $or: [
        { user1: userId, user2: friendId },
        { user1: friendId, user2: userId },
      ],
    });

    if (existing) {
      return res.json({
        message: "Friendship already exists",
        friendship: existing,
      });
    }

    const friendship = new Friendship({ user1: userId, user2: friendId });
    await friendship.save();
    res.json({ message: "Friendship created!", friendship });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;