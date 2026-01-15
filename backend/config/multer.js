import multer from "multer";
import path from "path";
import fs from "fs";

// Create uploads directories if they don't exist
const createUploadDirs = () => {
  const dirs = [
    "uploads/profileImages",
    "uploads/messages",
    "uploads/voice"
  ];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Created directory: ${dir}`);
    }
  });
};

createUploadDirs();

// Storage configuration for profile images
const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/profileImages");
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// Storage configuration for message attachments
const messageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/messages");
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}${path.extname(file.originalname)}`;
    console.log(` Saving file as: ${uniqueName}`);
    cb(null, uniqueName);
  }
});

// Storage configuration for voice messages
const voiceStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/voice");
  },
  filename: (req, file, cb) => {
    const uniqueName = `voice_${Date.now()}-${Math.random().toString(36).substring(7)}.webm`;
    cb(null, uniqueName);
  }
});

// Added image/jfif MIME type
const allowedMimeTypes = [
  "image/jpeg", 
  "image/jpg", 
  "image/png", 
  "image/gif", 
  "image/webp",
  "image/jfif",        
  "application/pdf", 
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "video/mp4", 
  "video/quicktime", 
  "video/x-msvideo",
  "audio/webm", 
    "image/avif",
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
  ".jfif",    
  ".pdf", 
  ".doc", 
  ".docx", 
  ".txt",
  ".mp4", 
  ".mov", 
  ".avi",
  ".webm", 
  ".avif",
  ".mp3", 
  ".mpeg", 
  ".ogg", 
  ".wav"
];

//  file filter
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  let mimetype = file.mimetype.toLowerCase();

  console.log(` File upload attempt:`, {
    originalName: file.originalname,
    mimetype: mimetype,
    extension: ext
  });

  //  JFIF files sometimes report as image/jpeg
  if (ext === '.jfif' && mimetype === 'image/jpeg') {
    mimetype = 'image/jfif'; // Normalize for consistency
  }

  // Check extension first 
  if (!allowedExtensions.includes(ext)) {
    console.error(` Extension not allowed: ${ext}`);
    return cb(new Error(`File extension not allowed: ${ext}`), false);
  }

  // Check MIME type (but allow JPEG for JFIF)
  if (!allowedMimeTypes.includes(mimetype) && 
      !(ext === '.jfif' && mimetype === 'image/jpeg')) {
    console.error(` MIME type not allowed: ${mimetype}`);
    return cb(new Error(`File type not allowed: ${mimetype}`), false);
  }

  console.log(` File accepted: ${file.originalname}`);
  cb(null, true);
};

// Profile image filter (only images)
const imageFilter = (req, file, cb) => {
  const imageTypes = /jpeg|jpg|png|gif|webp|avif|jfif/; 
  const extname = imageTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = imageTypes.test(file.mimetype) || file.mimetype === 'image/jfif' || file.mimetype === 'image/avif';
  
  console.log(` Profile image check:`, {
    filename: file.originalname,
    mimetype: file.mimetype,
    extname: extname,
    mimetypeMatch: mimetype
  });
  
  if (extname && (mimetype || file.mimetype === 'image/jpeg')) {
    console.log(` Profile image accepted`);
    cb(null, true);
  } else {
    console.error(` Only image files allowed`);
    cb(new Error("Only image files allowed"), false);
  }
};

// Multer instances
export const uploadProfile = multer({
  storage: profileStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: imageFilter
});

export const uploadMessage = multer({
  storage: messageStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter
});

export const uploadVoice = multer({
  storage: voiceStorage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});