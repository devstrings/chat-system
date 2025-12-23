// backend/middleware/upload.js
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";

const uploadDir = "./uploads";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Secure storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const randomName = crypto.randomBytes(16).toString("hex");
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, randomName + ext);
  },
});

// Allowed MIME types and extensions
const allowedMimeTypes = [
  "image/jpeg", 
  "image/jpg", 
  "image/png", 
  "image/gif",
  "image/webp",
  "application/pdf", 
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "video/mp4", 
  "video/quicktime", 
  "video/x-msvideo",
  "audio/webm", 
  "audio/mpeg", 
  "audio/mp3", 
  "audio/ogg",
  "audio/wav"
];

const allowedExtensions = [
  ".jpg", 
  ".jpeg", 
  ".png", 
  ".gif",
  ".webp",
  ".pdf", 
  ".doc", 
  ".docx", 
  ".txt",
  ".mp4", 
  ".mov", 
  ".avi",
  ".webm", 
  ".mp3", 
  ".mpeg", 
  ".ogg",
  ".wav",
  ".jfif"  
];

// File filter with error messages
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mimetype = file.mimetype.toLowerCase();

  console.log(" File validation:");
  console.log("  - Original name:", file.originalname);
  console.log("  - Extension:", ext);
  console.log("  - MIME type:", mimetype);

  //  Check MIME type first
  if (!allowedMimeTypes.includes(mimetype)) {
    console.log(" Invalid MIME type:", mimetype);
    console.log("  Allowed:", allowedMimeTypes.join(", "));
    return cb(new Error(`File type not allowed: ${mimetype}`), false);
  }

  // Check extension
  if (!allowedExtensions.includes(ext)) {
    console.log(" Invalid extension:", ext);
    console.log("  Allowed:", allowedExtensions.join(", "));
    return cb(new Error(`File extension not allowed: ${ext}`), false);
  }

  console.log(" File validation passed");
  cb(null, true);
};

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
    files: 1,
  },
  fileFilter,
});

export default upload;