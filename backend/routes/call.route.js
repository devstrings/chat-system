import express from "express";
import { verifyToken } from "#middleware/authMiddleware";
import { callController } from "#controllers";

const router = express.Router();
router.get("/turn-credentials", verifyToken, callController.getTurnCredentials);

/**
 * @swagger
 * /calls/history:
 *   get:
 *     summary: Get call history
 *     tags: [Calls]
 */
router.get("/history", verifyToken, callController.getCallHistory);

/**
 * @swagger
 * /calls/recent:
 *   get:
 *     summary: Get recent calls
 *     tags: [Calls]
 */
router.get("/recent", verifyToken, callController.getRecentCalls);

/**
 * @swagger
 * /calls/stats:
 *   get:
 *     summary: Get call stats
 *     tags: [Calls]
 */
router.get("/stats", verifyToken, callController.getCallStats);

/**
 * @swagger
 * /calls/conversation/{otherUserId}:
 *   get:
 *     summary: Get calls with a specific user
 *     tags: [Calls]
 */
router.get("/conversation/:otherUserId", verifyToken, callController.getCallsWithUser);

/**
 * @swagger
 * /calls/history/{callId}:
 *   delete:
 *     summary: Delete a specific call
 *     tags: [Calls]
 */
router.delete("/history/:callId", verifyToken, callController.deleteCallHistory);

/**
 * @swagger
 * /calls/clear-history:
 *   delete:
 *     summary: Clear all call history
 *     tags: [Calls]
 */
router.delete("/clear-history", verifyToken, callController.clearCallHistory);

/**
 * @swagger
 * /calls/{callId}:
 *   get:
 *     summary: Get call by ID
 *     tags: [Calls]
 */
router.get("/:callId", verifyToken, callController.getCallById);

export default router;