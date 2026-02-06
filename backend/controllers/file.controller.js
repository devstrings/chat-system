
import * as fileService from "../services/file.service.js";
import * as fileValidation from "../validations/file.validation.js";

//  Download file controller (authenticated & authorized)
export const downloadFile = async (req, res) => {
  try {
    const filename = req.params.filename;
    const userId = req.user.userId || req.user.id;

    // Validation
    const validation = fileValidation.validateDownloadRequest(filename);
    if (!validation.isValid) {
      return res.status(400).json({ message: validation.message });
    }

    // Service call
    const { filePath, attachment } = await fileService.processFileDownload(filename, userId);

    if (attachment) {
      // Send file with attachment metadata
      res.setHeader("Content-Type", attachment.fileType);
      res.setHeader(
        "Content-Disposition",
        `inline; filename="${attachment.fileName}"`,
      );
      return res.sendFile(filePath);
    }

    // If no attachment found but file exists, just send it
    return res.sendFile(filePath);

  } catch (error) {
    console.error(" File download error:", error);
    
    if (error.message === "File not found on server") {
      return res.status(404).json({ message: error.message });
    }
    
    if (error.message.includes("Access denied")) {
      return res.status(403).json({ message: error.message });
    }
    
    res.status(500).json({ message: "File download failed" });
  }
};

// Upload file controller (authenticated & authorized)
export const uploadFile = async (req, res) => {
  try {
    const { conversationId } = req.body;
    const userId = req.user.userId || req.user.id;

    // Validation
    const validation = fileValidation.validateUploadRequest(req.file, conversationId);
    if (!validation.isValid) {
      if (req.file) {
        fileService.cleanupFile(req.file.path);
      }
      return res.status(400).json({ message: validation.message });
    }

    // Verify user access to conversation/group
    try {
      await fileService.verifyUserAccess(conversationId, userId);
    } catch (accessError) {
      fileService.cleanupFile(req.file.path);
      
      if (accessError.message.includes("not found")) {
        return res.status(404).json({ message: accessError.message });
      }
      
      if (accessError.message.includes("Access denied")) {
        return res.status(403).json({ message: accessError.message });
      }
      
      throw accessError;
    }

    // Process file upload
    const result = await fileService.processFileUpload(
      req.file, 
      conversationId, 
      userId,
      req.body.isVoiceMessage
    );

    res.json(result);

  } catch (error) {
    console.error("Upload error:", error);
    console.error(" Error details:", error.message);

    // Cleanup uploaded file on error
    if (req.file) {
      fileService.cleanupFile(req.file.path);
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