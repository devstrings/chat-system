import { fileService } from "#services";
import asyncHandler from "express-async-handler";
import path from "path";
import fs from "fs";

export const serveStatusFile = asyncHandler(async (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(process.cwd(), "uploads", "status", filename);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: "File not found" });
  }
  
  return res.sendFile(filePath);
});
// DOWNLOAD FILE CONTROLLER
export const downloadFile = asyncHandler(async (req, res) => {
  const filename = req.params.filename;
  const userId = req.user.userId || req.user.id;
  const { filePath, attachment } = await fileService.processFileDownload(filename, userId);
  if (attachment) {
    res.setHeader("Content-Type", attachment.fileType);
    res.setHeader("Content-Disposition", `inline; filename="${attachment.fileName}"`);
    return res.sendFile(filePath);
  }
  return res.sendFile(filePath);
});

// UPLOAD FILE CONTROLLER
export const uploadFile = asyncHandler(async (req, res) => {
  const { conversationId } = req.body;
  const userId = req.user.userId || req.user.id;
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }
  await fileService.verifyUserAccess(conversationId, userId);
  const encryptionMeta = {
    isEncrypted: req.body.isEncrypted === "true",
    iv: req.body.encryptionIv || "",
    algorithm: req.body.encryptionAlgorithm || "",
    originalFileType: req.body.originalFileType || "",
  };
  const result = await fileService.processFileUpload(
    req.file,
    conversationId,
    userId,
    req.body.isVoiceMessage,
    encryptionMeta,
  );
  res.json(result);
});