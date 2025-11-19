import path from "path";
import fs from "fs";
import crypto from "crypto";
import Attachment from "../models/Attachment.js";
import Conversation from "../models/conversationModel.js";

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

// Download file controller (authenticated & authorized)
export const downloadFile = async (req, res) => {
  try {
    const filename = req.params.filename;
    const userId = req.user.userId; // from JWT token (verifyToken middleware)

    // Prevent path traversal
    if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
      return res.status(400).json({ message: "Invalid filename" });
    }

    // Find attachment in database
    const attachment = await Attachment.findOne({ 
      serverFileName: filename,
      status: "completed"
    });

    if (!attachment) {
      return res.status(404).json({ message: "File not found" });
    }

    // Find conversation and verify user access
    const conversation = await Conversation.findById(attachment.conversationId);
    
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    // Check if user is participant in the conversation
    const isParticipant = conversation.participants.some(
      participantId => participantId.toString() === userId.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({ 
        message: "Access denied: You don't have permission to access this file" 
      });
    }

    // Construct file path
    const filePath = path.join(process.cwd(), "uploads", filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "File not found on server" });
    }

    // Set proper headers for download
    res.setHeader('Content-Type', attachment.fileType);
    res.setHeader('Content-Disposition', `attachment; filename="${attachment.fileName}"`);
    
    // Send file
    res.sendFile(filePath);

  } catch (error) {
    console.error("File download error:", error);
    res.status(500).json({ message: "File download failed" });
  }
};

// Upload file controller (authenticated & authorized)
export const uploadFile = async (req, res) => {
  try {
    console.log(" Upload started");
    console.log("File:", req.file);
    console.log("Body:", req.body);
    console.log("User ID:", req.user?.userId);

    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const { conversationId } = req.body;
    const userId = req.user.userId; // from JWT token

    if (!conversationId) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: "Conversation ID required" });
    }

    // Verify user is participant in the conversation
    const conversation = await Conversation.findById(conversationId);
    
    if (!conversation) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ message: "Conversation not found" });
    }

    const isParticipant = conversation.participants.some(
      participantId => participantId.toString() === userId.toString()
    );

    if (!isParticipant) {
      fs.unlinkSync(req.file.path);
      return res.status(403).json({ 
        message: "Access denied: You are not a participant in this conversation" 
      });
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
    console.log(" Calculating file hash...");
    const fileHash = await calculateFileHash(req.file.path);
    console.log("Hash:", fileHash);

    // Check for duplicate in the same conversation
    const existingAttachment = await Attachment.findOne({
      fileHash,
      conversationId,
      status: "completed"
    });

    if (existingAttachment) {
      console.log(" Duplicate file found, reusing existing");
      fs.unlinkSync(req.file.path);
      return res.json({
        url: `/api/file/get/${existingAttachment.serverFileName}`,
        filename: req.file.originalname,
        fileType: existingAttachment.fileType,
        fileSize: req.file.size,
        attachmentId: existingAttachment._id,
        isDuplicate: true,
        message: "File already exists, reused existing file"
      });
    }

    // Save new attachment
    console.log(" Saving new attachment to database...");
    const attachment = await Attachment.create({
      conversationId,
      fileName: req.file.originalname,
      fileHash,
      sizeInKilobytes: Math.round(req.file.size / 1024),
      fileType: req.file.mimetype,
      serverFileName: req.file.filename,
      uploadedBy: userId,  
      status: "completed"
    });

    console.log(" Upload successful:", attachment._id);

    res.json({
      url: `/api/file/get/${req.file.filename}`,
      filename: req.file.originalname,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      attachmentId: attachment._id,
      isDuplicate: false
    });

  } catch (error) {
    console.error(" Upload error:", error);
    console.error("Error details:", error.message);
    console.error("Error code:", error.code);
    
    // Cleanup uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
      console.log(" Cleaned up uploaded file");
    }
    
    // Handle duplicate key error (concurrent uploads)
    if (error.code === 11000) {
      console.log("Duplicate key error - file already exists");
      return res.status(200).json({
        message: "File already exists in this conversation",
        isDuplicate: true
      });
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        message: "Validation failed", 
        error: error.message 
      });
    }
    
    res.status(500).json({ 
      message: "File upload failed", 
      error: error.message 
    });
  }
};