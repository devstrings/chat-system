import express from "express";
import {
  createStatus,
  getStatuses,
  getUserStatuses,
  markAsViewed,
  deleteStatus,
  getStatusViewers,
  updateStatusPrivacy,
  createFriendshipTest,
} from "#controllers/status.controller";
import { verifyToken } from "#middleware/authMiddleware";
import { uploadStatus } from "#config/multer";
import { validate } from "#middleware/validate";
import { createStatusValidation } from "#validators";
import {
  validateStatusExists,
  validateStatusOwner,
  validateStatusViewPermission,
} from "#validators/middleware/validation.middleware";

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
router.post("/test/create-friendship", verifyToken, createFriendshipTest);

export default router;