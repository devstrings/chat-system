import express from "express";
import rateLimit from "express-rate-limit";
import { uploadMessage } from "#config/multer";
import { verifyToken } from "#middleware/authMiddleware";
import { validate } from "#middleware/validate";
import { fileController, userController, groupController } from "#controllers";
import {
  uploadFileValidation,
  downloadFileValidation,
} from "#validators";
import {
  validateFileUploaded,
  validateFilename,
} from "#middleware/validation.middleware";

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
  fileController.uploadFile
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
  fileController.downloadFile
);

/**
 * @swagger
 * /files/profile/{filename}:
 *   get:
 *     summary: Serve profile image (authenticated)
 *     tags: [Files]
 */
router.get("/profile/:filename", verifyToken, userController.serveProfileImage);

/**
 * @swagger
 * /files/group/{filename}:
 *   get:
 *     summary: Serve group image (authenticated)
 *     tags: [Files]
 */
router.get("/group/:filename", verifyToken, downloadLimiter, groupController.serveGroupImage);

export default router;