import express from "express";
import upload from "../middleware/upload.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { uploadToCloudinary } from "../config/cloudinary.js";
import fs from "fs";

const router = express.Router();

//  Upload file endpoint
router.post("/file", verifyToken, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    console.log(" File received:", req.file);

    // Option 1: Use Cloudinary (cloud storage)
    // const cloudinaryResult = await uploadToCloudinary(req.file.path);
    // fs.unlinkSync(req.file.path); // Delete local file after upload
    // return res.json({
    //   url: cloudinaryResult.url,
    //   filename: req.file.originalname,
    //   fileType: req.file.mimetype,
    //   fileSize: req.file.size,
    // });

    // Option 2: Use local storage (simpler)
    const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
    
    res.json({
      url: fileUrl,
      filename: req.file.originalname,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
    });

  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ message: "File upload failed", error: error.message });
  }
});

export default router;