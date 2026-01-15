import express from "express";
import { 
  getUsers, 
  searchUsers, 
  getUserById,
  getCurrentUser,
  updateProfileImage,
  removeProfileImage,
  uploadProfileImage,
  serveProfileImage,
    uploadCoverPhoto,      
  removeCoverPhoto       
  // upload - DELETE THIS, multer se import karenge
} from "../controllers/user.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { uploadProfile } from "../config/multer.js"; 

const router = express.Router();

router.get("/image/:filename", verifyToken, serveProfileImage);
router.get("/auth/me", verifyToken, getCurrentUser); 
router.get("/search", verifyToken, searchUsers);
router.get("/", verifyToken, getUsers);
router.get("/:id", verifyToken, getUserById); 

// Profile image routes - FIX upload reference
router.post("/profile/upload", verifyToken, uploadProfile.single("image"), uploadProfileImage);
router.put("/profile/update-image", verifyToken, updateProfileImage);
router.delete("/profile/remove-image", verifyToken, removeProfileImage);
router.post("/profile/upload-cover", verifyToken, uploadProfile.single("coverPhoto"), uploadCoverPhoto);
router.delete("/profile/remove-cover", verifyToken, removeCoverPhoto);

export default router;