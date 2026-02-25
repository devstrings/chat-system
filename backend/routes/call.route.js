import express from "express";
import { verifyToken } from "../middleware/authMiddleware.js";
import Call from "../models/Call.js";
import {
  getCallHistory,
  getCallStats,
  deleteCallHistory,
  clearCallHistory,
  getRecentCalls,
  getCallById
} from "../controllers/call.controller.js";

const router = express.Router();

/**
 * @swagger
 * /calls/history:
 *   get:
 *     summary: Get call history
 *     tags: [Calls]
 */
router.get("/history", verifyToken, getCallHistory);

/**
 * @swagger
 * /calls/recent:
 *   get:
 *     summary: Get recent calls
 *     tags: [Calls]
 */
router.get("/recent", verifyToken, getRecentCalls);

/**
 * @swagger
 * /calls/stats:
 *   get:
 *     summary: Get call stats
 *     tags: [Calls]
 */
router.get("/stats", verifyToken, getCallStats);

/**
 * @swagger
 * /calls/conversation/{otherUserId}:
 *   get:
 *     summary: Get calls with a specific user
 *     tags: [Calls]
 */
router.get("/conversation/:otherUserId", verifyToken, async (req, res) => {
  try {
    const calls = await Call.find({
      $or: [
        { caller: req.user.id, receiver: req.params.otherUserId },
        { caller: req.params.otherUserId, receiver: req.user.id }
      ]
    }).sort({ createdAt: 1 });
    res.json(calls);
  } catch (err) {
    res.json([]);
  }
});

/**
 * @swagger
 * /calls/history/{callId}:
 *   delete:
 *     summary: Delete a specific call
 *     tags: [Calls]
 */
router.delete("/history/:callId", verifyToken, deleteCallHistory);

/**
 * @swagger
 * /calls/clear-history:
 *   delete:
 *     summary: Clear all call history
 *     tags: [Calls]
 */
router.delete("/clear-history", verifyToken, clearCallHistory);

/**
 * @swagger
 * /calls/{callId}:
 *   get:
 *     summary: Get call by ID
 *     tags: [Calls]
 */
router.get("/:callId", verifyToken, getCallById);

export default router;