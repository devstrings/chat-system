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

/**
 * @swagger
 * /friends/request/send:
 *   post:
 *     summary: Send a friend request
 *     tags: [Friends]
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
 *         description: Friend request sent
 */
router.post("/request/send", verifyToken, sendFriendRequest);

/**
 * @swagger
 * /friends/request/{requestId}/accept:
 *   post:
 *     summary: Accept a friend request
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Friend request accepted
 */
router.post("/request/:requestId/accept", verifyToken, acceptFriendRequest);

/**
 * @swagger
 * /friends/request/{requestId}/reject:
 *   delete:
 *     summary: Reject a friend request
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Friend request rejected
 */
router.delete("/request/:requestId/reject", verifyToken, rejectFriendRequest);

/**
 * @swagger
 * /friends/requests/pending:
 *   get:
 *     summary: Get pending friend requests
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of pending friend requests
 */
router.get("/requests/pending", verifyToken, getPendingRequests);

/**
 * @swagger
 * /friends/requests/sent:
 *   get:
 *     summary: Get sent friend requests
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of sent friend requests
 */
router.get("/requests/sent", verifyToken, getSentRequests);

/**
 * @swagger
 * /friends/unfriend/{friendId}:
 *   delete:
 *     summary: Unfriend a user
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: friendId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User unfriended
 */
router.delete("/unfriend/:friendId", verifyToken, unfriend);

/**
 * @swagger
 * /friends/block:
 *   post:
 *     summary: Block a user
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *     responses:
 *       200:
 *         description: User blocked
 */
router.post("/block", verifyToken, blockUser);

/**
 * @swagger
 * /friends/unblock/{userId}:
 *   delete:
 *     summary: Unblock a user
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User unblocked
 */
router.delete("/unblock/:userId", verifyToken, unblockUser);

/**
 * @swagger
 * /friends/blocked:
 *   get:
 *     summary: Get blocked users
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of blocked users
 */
router.get("/blocked", verifyToken, getBlockedUsers);

/**
 * @swagger
 * /friends/status/{userId}:
 *   get:
 *     summary: Get relationship status with a user
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Relationship status retrieved
 */
router.get("/status/:userId", verifyToken, getRelationshipStatus);

/**
 * @swagger
 * /friends/list:
 *   get:
 *     summary: Get friends list
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of friends
 */
router.get("/list", verifyToken, getFriends);

export default router;
