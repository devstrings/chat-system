import path from "path";
import fs from "fs";
import crypto from "crypto";
import { getAudioDurationInSeconds } from "get-audio-duration";
import Attachment from "#models/Attachment";
import Conversation from "#models/Conversation";
import Group from "#models/Group";
import AppError from "#shared/AppError";
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

  // Extra safety check
  if (
    filename.includes("..") ||
    filename.includes("/") ||
    filename.includes("\\")
  ) {
throw new AppError("File not found on server", 404);  }

  const possiblePaths = [
    path.join(process.cwd(), "uploads", "messages", filename),
    path.join(process.cwd(), "uploads", filename),
  ];

  let filePath = null;
  for (const tryPath of possiblePaths) {
    if (fs.existsSync(tryPath)) {
      filePath = tryPath;
      break;
    }
  }

  if (!filePath) {
    throw new AppError("File not found on server", 404);
  }

  // Find attachment ( - for permission check)
  const attachment = await Attachment.findOne({
    serverFileName: filename,
    status: "completed",
  });

  if (!attachment) {
    return { filePath, attachment: null };
  }


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
  throw new AppError("Access denied: You don't have permission to access this file", 403);
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
throw new AppError("Conversation or group not found", 404);    }

    // Check if user is group member
    isParticipant = group.members.some(
      (memberId) => memberId.toString() === userId.toString(),
    );
  }

  if (!isParticipant) {
   throw new AppError("Access denied: You are not a participant in this conversation", 403);
  }

  return true;
};

// CALCULATE AUDIO DURATION SERVICE
export const calculateAudioDuration = async (file) => {
  let audioDuration = null;
  let isVoiceMessage = false;

  if (file.mimetype.startsWith("audio/")) {
    try {
      audioDuration = await getAudioDurationInSeconds(file.path);
      audioDuration = Math.floor(audioDuration);

      isVoiceMessage = file.originalname.includes("voice_") || false; // This will be set from request body in controller

    
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
export const processFileUpload = async (
  file,
  conversationId,
  userId,
  isVoiceMessageFlag,
  encryptionMeta = {},
) => {

  // Calculate audio duration for audio files
  const { audioDuration, isVoiceMessage: audioIsVoice } =
    await calculateAudioDuration(file);

  // Override with explicit flag from request
  const isVoiceMessage = isVoiceMessageFlag === "true" || audioIsVoice;
  const isEncrypted = encryptionMeta?.isEncrypted === true;
  const encryptionIv = encryptionMeta?.iv || "";
  const encryptionAlgorithm = encryptionMeta?.algorithm || "";
  const originalFileType = encryptionMeta?.originalFileType || file.mimetype;

  // Calculate hash
  const fileHash = await calculateFileHash(file.path);

  // Check for duplicate in the same conversation
  const existingAttachment = await checkDuplicateFile(fileHash, conversationId);

  if (existingAttachment) {

    // Clean up uploaded file since we're using existing one
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    return {
      url: `/api/file/get/${existingAttachment.serverFileName}`,
      filename: file.originalname,
      fileType: existingAttachment.originalFileType || existingAttachment.fileType,
      fileSize: existingAttachment.sizeInKilobytes * 1024,
      duration: existingAttachment.duration || 0,
      isVoiceMessage: existingAttachment.isVoiceMessage || false,
      isEncrypted: existingAttachment.isEncrypted || false,
      encryptionData: existingAttachment.encryptionData || { iv: "", algorithm: "" },
      originalFileType:
        existingAttachment.originalFileType || existingAttachment.fileType,
      attachmentId: existingAttachment._id,
      isDuplicate: true,
      message: "File already exists, reused existing file",
    };
  }

  // Save new attachment
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
    isEncrypted,
    encryptionData: {
      iv: encryptionIv,
      algorithm: encryptionAlgorithm,
    },
    originalFileType,
    status: "completed",
  });


  return {
    url: `/api/file/get/${file.filename}`,
    filename: file.originalname,
    fileType: originalFileType,
    fileSize: file.size,
    duration: audioDuration || 0,
    isVoiceMessage: isVoiceMessage || false,
    isEncrypted,
    encryptionData: {
      iv: encryptionIv,
      algorithm: encryptionAlgorithm,
    },
    originalFileType,
    attachmentId: attachment._id,
    isDuplicate: false,
  };
};

// CLEANUP FILE SERVICE
export const cleanupFile = (filePath) => {
  if (filePath && fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
};
