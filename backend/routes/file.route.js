import express from "express";
import rateLimit from "express-rate-limit";
import { uploadMessage } from "../config/multer.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { validate } from "../validators/middleware/validate.js";
import { downloadFile, uploadFile } from "../controllers/file.controller.js";
import { serveProfileImage } from "../controllers/user.controller.js";
import { serveGroupImage } from "../controllers/group.controller.js";
import {
  uploadFileValidation,
  downloadFileValidation,
} from "../validators/index.js";
import {
  validateFileUploaded,
  validateFilename,
} from "../validators/middleware/validation.middleware.js";

const router = express.Router();

// Rate limiters
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: "Too many file uploads, please try again after 15 minutes",
});

const downloadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: "Too many file downloads, please try again after 15 minutes",
});

/**
 * @swagger
 * /files/upload:
 *   post:
 *     summary: Upload a file (authenticated)
 *     tags: [Files]
 */
router.post(
  "/upload",
  verifyToken,
  uploadLimiter,
  uploadMessage.single("file"),
  uploadFileValidation,
  validate,
  uploadFile
);

/**
 * @swagger
 * /files/get/{filename}:
 *   get:
 *     summary: Download a file (authenticated)
 *     tags: [Files]
 */
router.get(
  "/get/:filename",
  verifyToken,
  downloadLimiter,
  downloadFileValidation,
  validate,
  validateFilename,
  downloadFile
);

/**
 * @swagger
 * /files/profile/{filename}:
 *   get:
 *     summary: Serve profile image (authenticated)
 *     tags: [Files]
 */
router.get("/profile/:filename", verifyToken, serveProfileImage);

/**
 * @swagger
 * /files/group/{filename}:
 *   get:
 *     summary: Serve group image (authenticated)
 *     tags: [Files]
 */
router.get("/group/:filename", verifyToken, downloadLimiter, serveGroupImage);

export default router;