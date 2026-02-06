// fileService.js - All business logic and file operations

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

// DOWNLOAD FILE SERVICE
export const processFileDownload = async (filename, userId) => {
  console.log(" Download request:", { filename, userId });

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
    throw new Error("File not found on server");
  }

  // Find attachment ( - for permission check)
  const attachment = await Attachment.findOne({
    serverFileName: filename,
    status: "completed",
  });

  if (!attachment) {
    return { filePath, attachment: null };
  }

  console.log(" Attachment found in database");

  //  Check both Conversation and Group
  let hasAccess = false;

  const conversation = await Conversation.findById(attachment.conversationId);

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
    throw new Error("Access denied: You don't have permission to access this file");
  }

  return { filePath, attachment };
};

// VERIFY USER ACCESS SERVICE
export const verifyUserAccess = async (conversationId, userId) => {
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
    const group = await Group.findById(conversationId);

    if (!group) {
      throw new Error("Conversation or group not found");
    }

    // Check if user is group member
    isParticipant = group.members.some(
      (memberId) => memberId.toString() === userId.toString(),
    );
  }

  if (!isParticipant) {
    throw new Error("Access denied: You are not a participant in this conversation");
  }

  return true;
};

// CALCULATE AUDIO DURATION SERVICE
export const calculateAudioDuration = async (file) => {
  let audioDuration = null;
  let isVoiceMessage = false;

  if (file.mimetype.startsWith("audio/")) {
    try {
      console.log(" Calculating audio duration...");
      audioDuration = await getAudioDurationInSeconds(file.path);
      audioDuration = Math.floor(audioDuration);

      isVoiceMessage =
        file.originalname.includes("voice_") ||
        false; // This will be set from request body in controller

      console.log(
        `Audio duration: ${audioDuration}s, Voice: ${isVoiceMessage}`,
      );
    } catch (err) {
      console.error(" Duration calculation failed:", err);
    }
  }

  return { audioDuration, isVoiceMessage };
};

// CHECK DUPLICATE FILE SERVICE
export const checkDuplicateFile = async (fileHash, conversationId) => {
  const existingAttachment = await Attachment.findOne({
    fileHash,
    conversationId,
    status: "completed",
  });

  return existingAttachment;
};

// UPLOAD FILE SERVICE
export const processFileUpload = async (file, conversationId, userId, isVoiceMessageFlag) => {
  console.log(" Upload started");
  console.log(" File:", file);
  console.log(" User ID extracted:", userId);

  // Calculate audio duration for audio files
  const { audioDuration, isVoiceMessage: audioIsVoice } = await calculateAudioDuration(file);
  
  // Override with explicit flag from request
  const isVoiceMessage = isVoiceMessageFlag === "true" || audioIsVoice;

  // Calculate hash
  console.log(" Calculating file hash...");
  const fileHash = await calculateFileHash(file.path);
  console.log(" Hash:", fileHash);

  // Check for duplicate in the same conversation
  const existingAttachment = await checkDuplicateFile(fileHash, conversationId);

  if (existingAttachment) {
    console.log(" Duplicate file found, reusing existing");
    
    // Clean up uploaded file since we're using existing one
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    return {
      url: `/api/file/get/${existingAttachment.serverFileName}`,
      filename: file.originalname,
      fileType: existingAttachment.fileType,
      fileSize: existingAttachment.sizeInKilobytes * 1024,
      duration: existingAttachment.duration || 0,
      isVoiceMessage: existingAttachment.isVoiceMessage || false,
      attachmentId: existingAttachment._id,
      isDuplicate: true,
      message: "File already exists, reused existing file",
    };
  }

  // Save new attachment
  console.log(" Saving new attachment to database...");
  const attachment = await Attachment.create({
    conversationId,
    fileName: file.originalname,
    fileHash,
    sizeInKilobytes: Math.round(file.size / 1024),
    fileType: file.mimetype,
    serverFileName: file.filename,
    uploadedBy: userId,
    duration: audioDuration,
    isVoiceMessage: isVoiceMessage,
    status: "completed",
  });

  console.log(" Upload successful:", attachment._id);

  return {
    url: `/api/file/get/${file.filename}`,
    filename: file.originalname,
    fileType: file.mimetype,
    fileSize: file.size,
    duration: audioDuration || 0,
    isVoiceMessage: isVoiceMessage || false,
    attachmentId: attachment._id,
    isDuplicate: false,
  };
};

// CLEANUP FILE SERVICE
export const cleanupFile = (filePath) => {
  if (filePath && fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    console.log("Cleaned up uploaded file");
  }
};