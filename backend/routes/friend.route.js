import express from "express";
import { friendController } from "#controllers";
import { verifyToken } from "#middleware/authMiddleware";
import { validate } from "#middleware/validate";
import {
  sendFriendRequestValidation,
  blockUserValidation,
} from "#validators";
import {
  validateNotSelf,
  validateNotBlocked,
  validateFriendRequest,
  validateFriendRequestForReject,
} from "#middleware/validation.middleware";

const router = express.Router();

/**
 * @swagger
 * /friends/request/send:
 *   post:
 *     summary: Send a friend request
 *     tags: [Friends]
 */
router.post(
  "/request/send",
  verifyToken,
  sendFriendRequestValidation,
  validate,
  validateNotSelf,
  validateNotBlocked,
  friendController.sendFriendRequest
);

/**
 * @swagger
 * /friends/request/{requestId}/accept:
 *   post:
 *     summary: Accept a friend request
 *     tags: [Friends]
 */
router.post(
  "/request/:requestId/accept",
  verifyToken,
  validateFriendRequest,
  friendController.acceptFriendRequest
);

/**
 * @swagger
 * /friends/request/{requestId}/reject:
 *   delete:
 *     summary: Reject a friend request
 *     tags: [Friends]
 */
router.delete(
  "/request/:requestId/reject",
  verifyToken,
  validateFriendRequestForReject,
  friendController.rejectFriendRequest
);

/**
 * @swagger
 * /friends/requests/pending:
 *   get:
 *     summary: Get pending friend requests
 *     tags: [Friends]
 */
router.get("/requests/pending", verifyToken, friendController.getPendingRequests);

/**
 * @swagger
 * /friends/requests/sent:
 *   get:
 *     summary: Get sent friend requests
 *     tags: [Friends]
 */
router.get("/requests/sent", verifyToken, friendController.getSentRequests);

/**
 * @swagger
 * /friends/unfriend/{friendId}:
 *   delete:
 *     summary: Unfriend a user
 *     tags: [Friends]
 */
router.delete("/unfriend/:friendId", verifyToken, friendController.unfriend);

/**
 * @swagger
 * /friends/block:
 *   post:
 *     summary: Block a user
 *     tags: [Friends]
 */
router.post(
  "/block",
  verifyToken,
  blockUserValidation,
  validate,
  validateNotSelf,
  friendController.blockUser
);

/**
 * @swagger
 * /friends/unblock/{userId}:
 *   delete:
 *     summary: Unblock a user
 *     tags: [Friends]
 */
router.delete("/unblock/:userId", verifyToken, friendController.unblockUser);

/**
 * @swagger
 * /friends/blocked:
 *   get:
 *     summary: Get blocked users
 *     tags: [Friends]
 */
router.get("/blocked", verifyToken, friendController.getBlockedUsers);

/**
 * @swagger
 * /friends/status/{userId}:
 *   get:
 *     summary: Get relationship status with a user
 *     tags: [Friends]
 */
router.get("/status/:userId", verifyToken, friendController.getRelationshipStatus);

/**
 * @swagger
 * /friends/list:
 *   get:
 *     summary: Get friends list
 *     tags: [Friends]
 */
router.get("/list", verifyToken, friendController.getFriends);

export default router;