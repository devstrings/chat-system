import express from "express";
import upload from "../middleware/upload.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import fs from "fs";

const router = express.Router();

router.post("/file", verifyToken, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    console.log(" File received:", req.file);

    // SECURE: Return only filename, not full path
    const fileUrl = `/api/download/file/${req.file.filename}`;
    
    res.json({
      url: fileUrl, // Protected URL
      filename: req.file.originalname,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
    });

  } catch (error) {
    console.error("Upload error:", error);
    
    // Delete file if error occurs
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ message: "File upload failed", error: error.message });
  }
});

export default router;