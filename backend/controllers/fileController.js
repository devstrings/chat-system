import path from "path";
import fs from "fs";
import crypto from "crypto";
import Attachment from "../models/Attachment.js";

// Allowed MIME types and extensions
const ALLOWED_TYPES = [
  "image/jpeg", "image/png", "image/gif",
  "application/pdf", "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "video/mp4", "video/quicktime", "video/x-msvideo"
];
const ALLOWED_EXTENSIONS = [
  ".jpg", ".jpeg", ".png", ".gif",
  ".pdf", ".txt", ".doc", ".docx",
  ".mp4", ".mov", ".avi"
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

// Calculate SHA256 hash of file
const calculateFileHash = (filePath) =>
  new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(filePath);
    stream.on("data", (data) => hash.update(data));
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", (err) => reject(err));
  });

// Download file controller (authenticated)
export const downloadFile = async (req, res) => {
  try {
    const filename = req.params.filename;

    // Prevent path traversal
    if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
      return res.status(400).json({ message: "Invalid filename" });
    }

    const filePath = path.join(process.cwd(), "uploads", filename);

    if (!fs.existsSync(filePath)) return res.status(404).json({ message: "File not found" });

    // Optional: check if user has permission to access this file

    res.sendFile(filePath);
  } catch (error) {
    console.error("File download error:", error);
    res.status(500).json({ message: "File download failed" });
  }
};

// Upload file controller (authenticated)
export const uploadFile = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const { conversationId } = req.body;
    if (!conversationId) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: "Conversation ID required" });
    }

    // File type check
    if (!ALLOWED_TYPES.includes(req.file.mimetype) ||
        !ALLOWED_EXTENSIONS.includes(path.extname(req.file.originalname).toLowerCase())) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: "File type or extension not allowed" });
    }

    // File size check
    if (req.file.size > MAX_FILE_SIZE) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: "File too large" });
    }

    // Calculate hash
    const fileHash = await calculateFileHash(req.file.path);

    // Check for duplicate in the same conversation
    const existingAttachment = await Attachment.findOne({
      fileHash,
      conversationId,
      status: "completed"
    });

    if (existingAttachment) {
      fs.unlinkSync(req.file.path);
      return res.json({
        url: `/api/file/get/${existingAttachment.serverFileName}`,
        filename: req.file.originalname,
        fileType: existingAttachment.fileType,
        fileSize: req.file.size,
        attachmentId: existingAttachment._id,
        message: "File already exists, reused existing file"
      });
    }

    // Save new attachment
    const attachment = await Attachment.create({
      conversationId,
      fileName: req.file.originalname,
      fileHash,
      sizeInKilobytes: Math.round(req.file.size / 1024),
      fileType: req.file.mimetype,
      serverFileName: req.file.filename,
      status: "completed"
    });

    res.json({
      url: `/api/file/get/${req.file.filename}`,
      filename: req.file.originalname,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      attachmentId: attachment._id
    });

  } catch (error) {
    console.error("Upload error:", error);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ message: "File upload failed", error: error.message });
  }
};
