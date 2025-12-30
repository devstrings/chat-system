import express from "express";
import rateLimit from "express-rate-limit";
import { uploadMessage } from "../config/multer.js"; 
import { verifyToken } from "../middleware/authMiddleware.js";
import { downloadFile, uploadFile } from "../controllers/fileController.js";
import { serveProfileImage } from "../controllers/userController.js"; 

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

// Upload file (authenticated) 
router.post("/upload", verifyToken, uploadLimiter, uploadMessage.single("file"), uploadFile);

// Get file (authenticated)
router.get("/get/:filename", verifyToken, downloadLimiter, downloadFile);

// Serve profile image (authenticated)
router.get("/profile/:filename", verifyToken, serveProfileImage);

export default router;