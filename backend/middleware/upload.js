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
  "image/jpeg", "image/jpg", "image/png", "image/gif",
  "application/pdf", "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "video/mp4", "video/quicktime", "video/x-msvideo"
];
const allowedExtensions = [
  ".jpg", ".jpeg", ".png", ".gif",
  ".pdf", ".doc", ".docx", ".txt",
  ".mp4", ".mov", ".avi"
];

// File filter
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();

  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(new Error("Invalid file type. Only specific file types allowed."));
  }

  if (!allowedExtensions.includes(ext)) {
    return cb(new Error("Invalid file extension."));
  }

  cb(null, true);
};

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
    files: 1, // Only 1 file at a time
  },
  fileFilter,
});

export default upload;
