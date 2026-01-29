import path from "path";
import fs from "fs";
import crypto from "crypto";
import { getAudioDurationInSeconds } from "get-audio-duration";
import Attachment from "../models/Attachment.js";
import Conversation from "../models/Conversation.js";
import Group from "../models/Group.js";

// Calculate SHA256 hash of file
const calculateFileHash = (filePath) =>
  new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(filePath);
    stream.on("data", (data) => hash.update(data));
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", (err) => reject(err));
  });

//  Download file controller (authenticated & authorized)
export const downloadFile = async (req, res) => {
  try {
    const filename = req.params.filename;
    const userId = req.user.userId || req.user.id;

    console.log(" Download request:", { filename, userId });

    // Prevent path traversal
    if (
      filename.includes("..") ||
      filename.includes("/") ||
      filename.includes("\\")
    ) {
      return res.status(400).json({ message: "Invalid filename" });
    }

    //  Try multiple possible file paths
    const possiblePaths = [
      path.join(process.cwd(), "uploads", "messages", filename),
      path.join(process.cwd(), "uploads", filename),
    ];

    let filePath = null;
    for (const tryPath of possiblePaths) {
      console.log(" Checking path:", tryPath);
      if (fs.existsSync(tryPath)) {
        filePath = tryPath;
        console.log("File found at:", filePath);
        break;
      }
    }

    if (!filePath) {
      console.error(" File not found in any location:", filename);
      return res.status(404).json({ message: "File not found on server" });
    }

    // Find attachment ( - for permission check)
    const attachment = await Attachment.findOne({
      serverFileName: filename,
      status: "completed",
    });

    if (attachment) {
      console.log(" Attachment found in database");

      //  Check both Conversation and Group
      let hasAccess = false;

      const conversation = await Conversation.findById(
        attachment.conversationId,
      );

      if (conversation) {
        // Regular conversation - check participants
        hasAccess = conversation.participants.some(
          (participantId) => participantId.toString() === userId.toString(),
        );
      } else {
        // Try as Group - check members
        const group = await Group.findById(attachment.conversationId);
        if (group) {
          hasAccess = group.members.some(
            (memberId) => memberId.toString() === userId.toString(),
          );
        }
      }

      if (!hasAccess) {
        return res.status(403).json({
          message:
            "Access denied: You don't have permission to access this file",
        });
      }

      // Send file
      res.setHeader("Content-Type", attachment.fileType);
      res.setHeader(
        "Content-Disposition",
        `inline; filename="${attachment.fileName}"`,
      );
      return res.sendFile(filePath);
    }
  } catch (error) {
    console.error(" File download error:", error);
    res.status(500).json({ message: "File download failed" });
  }
};

// Upload file controller (authenticated & authorized)
export const uploadFile = async (req, res) => {
  try {
    console.log(" Upload started");
    console.log(" File:", req.file);
    console.log(" Body:", req.body);
    console.log(" User:", req.user);

    // Check if file exists
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const { conversationId } = req.body;
    const userId = req.user.userId || req.user.id;

    console.log(" User ID extracted:", userId);

    if (!conversationId) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: "Conversation ID required" });
    }

    // Verify user is participant in the conversation
    // Check both Conversation and Group
    let conversation = await Conversation.findById(conversationId);
    let isParticipant = false;

    if (conversation) {
      // Regular conversation
      isParticipant = conversation.participants.some(
        (participantId) => participantId.toString() === userId.toString(),
      );
    } else {
      // Try as Group
      const Group = (await import("../models/Group.js")).default;
      const group = await Group.findById(conversationId);

      if (!group) {
        fs.unlinkSync(req.file.path);
        return res
          .status(404)
          .json({ message: "Conversation or group not found" });
      }

      // Check if user is group member
      isParticipant = group.members.some(
        (memberId) => memberId.toString() === userId.toString(),
      );
    }

    if (!isParticipant) {
      fs.unlinkSync(req.file.path);
      return res.status(403).json({
        message:
          "Access denied: You are not a participant in this conversation",
      });
    }

    // Calculate audio duration for audio files
    let audioDuration = null;
    let isVoiceMessage = false;

    if (req.file.mimetype.startsWith("audio/")) {
      try {
        console.log(" Calculating audio duration...");
        audioDuration = await getAudioDurationInSeconds(req.file.path);
        audioDuration = Math.floor(audioDuration);

        isVoiceMessage =
          req.file.originalname.includes("voice_") ||
          req.body.isVoiceMessage === "true";

        console.log(
          `Audio duration: ${audioDuration}s, Voice: ${isVoiceMessage}`,
        );
      } catch (err) {
        console.error(" Duration calculation failed:", err);
      }
    }

    // Calculate hash
    console.log(" Calculating file hash...");
    const fileHash = await calculateFileHash(req.file.path);
    console.log(" Hash:", fileHash);

    // Check for duplicate in the same conversation
    const existingAttachment = await Attachment.findOne({
      fileHash,
      conversationId,
      status: "completed",
    });

    if (existingAttachment) {
      console.log(" Duplicate file found, reusing existing");
      fs.unlinkSync(req.file.path);

      return res.json({
        url: `/api/file/get/${existingAttachment.serverFileName}`,
        filename: req.file.originalname,
        fileType: existingAttachment.fileType,
        fileSize: existingAttachment.sizeInKilobytes * 1024,
        duration: existingAttachment.duration || 0,
        isVoiceMessage: existingAttachment.isVoiceMessage || false,
        attachmentId: existingAttachment._id,
        isDuplicate: true,
        message: "File already exists, reused existing file",
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
      duration: audioDuration,
      isVoiceMessage: isVoiceMessage,
      status: "completed",
    });

    console.log(" Upload successful:", attachment._id);

    res.json({
      url: `/api/file/get/${req.file.filename}`,
      filename: req.file.originalname,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      duration: audioDuration || 0,
      isVoiceMessage: isVoiceMessage || false,
      attachmentId: attachment._id,
      isDuplicate: false,
    });
  } catch (error) {
    console.error("Upload error:", error);
    console.error(" Error details:", error.message);

    // Cleanup uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
      console.log("Cleaned up uploaded file");
    }

    // Handle duplicate key error
    if (error.code === 11000) {
      console.log(" Duplicate key error");
      return res.status(200).json({
        message: "File already exists in this conversation",
        isDuplicate: true,
      });
    }

    // Handle validation errors
    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: "Validation failed",
        error: error.message,
      });
    }

    res.status(500).json({
      message: "File upload failed",
      error: error.message,
    });
  }
};
