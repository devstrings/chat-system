import express from "express";
import rateLimit from "express-rate-limit";
import { uploadMessage } from "../config/multer.js"; 
import { verifyToken } from "../middleware/authMiddleware.js";
import { downloadFile, uploadFile } from "../controllers/file.controller.js";
import { serveProfileImage } from "../controllers/user.controller.js"; 
import { serveGroupImage } from "../controllers/group.controller.js"; 

const router = express.Router();

// Rate limiters
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: "Too many file uploads, please try again after 15 minutes"
});

const downloadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: "Too many file downloads, please try again after 15 minutes"
});

/**
 * @swagger
 * /files/upload:
 *   post:
 *     summary: Upload a file (authenticated)
 *     tags: [Files]
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
 *       200:
 *         description: File uploaded successfully
 */
router.post("/upload", verifyToken, uploadLimiter, uploadMessage.single("file"), uploadFile);

/**
 * @swagger
 * /files/get/{filename}:
 *   get:
 *     summary: Download a file (authenticated)
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: File downloaded successfully
 */
router.get("/get/:filename", verifyToken, downloadLimiter, downloadFile);

/**
 * @swagger
 * /files/profile/{filename}:
 *   get:
 *     summary: Serve profile image (authenticated)
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Profile image served
 */
router.get("/profile/:filename", verifyToken, serveProfileImage);

/**
 * @swagger
 * /files/group/{filename}:
 *   get:
 *     summary: Serve group image (authenticated)
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Group image served
 */
router.get("/group/:filename", verifyToken, downloadLimiter, serveGroupImage);

export default router;
