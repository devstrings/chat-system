import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";

const uploadDir = "./uploads";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// More secure storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Use cryptographically secure random filename
    const randomName = crypto.randomBytes(16).toString("hex");
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, randomName + ext);
  },
});

// Stricter file filter
const fileFilter = (req, file, cb) => {
  // Whitelist of allowed MIME types
  const allowedMimeTypes = [
    "image/jpeg",
    "image/jpg", 
    "image/png",
    "image/gif",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "video/mp4",
    "video/quicktime",
    "video/x-msvideo"
  ];

  // Check MIME type
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(new Error("Invalid file type. Only specific file types allowed."));
  }

  // Check extension
  const allowedExtensions = [".jpg", ".jpeg", ".png", ".gif", ".pdf", ".doc", ".docx", ".txt", ".mp4", ".mov", ".avi"];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (!allowedExtensions.includes(ext)) {
    return cb(new Error("Invalid file extension."));
  }

  cb(null, true);
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 1, // Only 1 file at a time
  },
  fileFilter: fileFilter,
});

export default upload;