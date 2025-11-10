import express from "express";
import path from "path";
import fs from "fs";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// Protected file access route
router.get("/file/:filename", verifyToken, async (req, res) => {
  try {
    const filename = req.params.filename;
    
    // Security: Prevent path traversal
    if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
      return res.status(400).json({ message: "Invalid filename" });
    }

    const filePath = path.join(process.cwd(), "uploads", filename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "File not found" });
    }

    // Send file
    res.sendFile(filePath);
  } catch (error) {
    console.error("File download error:", error);
    res.status(500).json({ message: "File download failed" });
  }
});

export default router;