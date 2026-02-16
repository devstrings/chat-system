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
import { validate } from "../validators/middleware/validate.js";
import {
  sendFriendRequestValidation,
  blockUserValidation,
} from "../validators/index.js";
import {
  validateNotSelf,
  validateNotBlocked,
  validateFriendRequest,
  validateFriendRequestForReject,
} from "../validators/middleware/validation.middleware.js";

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
  sendFriendRequest
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
  acceptFriendRequest
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
  rejectFriendRequest
);

/**
 * @swagger
 * /friends/requests/pending:
 *   get:
 *     summary: Get pending friend requests
 *     tags: [Friends]
 */
router.get("/requests/pending", verifyToken, getPendingRequests);

/**
 * @swagger
 * /friends/requests/sent:
 *   get:
 *     summary: Get sent friend requests
 *     tags: [Friends]
 */
router.get("/requests/sent", verifyToken, getSentRequests);

/**
 * @swagger
 * /friends/unfriend/{friendId}:
 *   delete:
 *     summary: Unfriend a user
 *     tags: [Friends]
 */
router.delete("/unfriend/:friendId", verifyToken, unfriend);

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
  blockUser
);

/**
 * @swagger
 * /friends/unblock/{userId}:
 *   delete:
 *     summary: Unblock a user
 *     tags: [Friends]
 */
router.delete("/unblock/:userId", verifyToken, unblockUser);

/**
 * @swagger
 * /friends/blocked:
 *   get:
 *     summary: Get blocked users
 *     tags: [Friends]
 */
router.get("/blocked", verifyToken, getBlockedUsers);

/**
 * @swagger
 * /friends/status/{userId}:
 *   get:
 *     summary: Get relationship status with a user
 *     tags: [Friends]
 */
router.get("/status/:userId", verifyToken, getRelationshipStatus);

/**
 * @swagger
 * /friends/list:
 *   get:
 *     summary: Get friends list
 *     tags: [Friends]
 */
router.get("/list", verifyToken, getFriends);

export default router;