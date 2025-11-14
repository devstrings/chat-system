import express from "express";
import upload from "../middleware/upload.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { downloadFile, uploadFile } from "../controllers/fileController.js";

const router = express.Router();

// Download file endpoint (authenticated)
router.get("/get/:filename", verifyToken, downloadFile);

// Upload file endpoint (authenticated)
router.post("/upload", verifyToken, upload.single("file"), uploadFile);

export default router;
