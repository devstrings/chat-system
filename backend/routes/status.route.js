import express from "express";
import { statusController } from "#controllers";
import { verifyToken } from "#middleware/authMiddleware";
import { uploadStatus } from "#config/multer";
import { validate } from "#middleware/validate";
import { createStatusValidation } from "#validators";
import {
  validateStatusExists,
  validateStatusOwner,
  validateStatusViewPermission,
} from "#middleware/validation.middleware";

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
  statusController.createStatus
);

/**
 * @swagger
 * /status:
 *   get:
 *     summary: Get all statuses from friends
 *     tags: [Status]
 */
router.get("/", verifyToken, statusController.getStatuses);

/**
 * @swagger
 * /status/user/{userId}:
 *   get:
 *     summary: Get statuses of a specific user
 *     tags: [Status]
 */
router.get("/user/:userId", verifyToken, statusController.getUserStatuses);

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
  statusController.markAsViewed
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
  statusController.deleteStatus
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
  statusController.getStatusViewers
);

/**
 * @swagger
 * /status/privacy:
 *   put:
 *     summary: Update status privacy settings
 *     tags: [Status]
 */
router.put("/privacy", verifyToken, statusController.updateStatusPrivacy);

/**
 * @swagger
 * /status/test/create-friendship:
 *   post:
 *     summary: TEMP - Create friendship (for testing)
 *     tags: [Status]
 */
router.post("/test/create-friendship", verifyToken, statusController.createFriendshipTest);

export default router;