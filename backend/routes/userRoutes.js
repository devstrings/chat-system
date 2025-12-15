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
  upload
} from "../controllers/userController.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/image/:filename", verifyToken, serveProfileImage);
router.get("/auth/me", verifyToken, getCurrentUser); 
router.get("/search", verifyToken, searchUsers);
router.get("/", verifyToken, getUsers);
router.get("/:id", verifyToken, getUserById); 

// Profile image routes
router.post("/profile/upload", verifyToken, upload.single("image"), uploadProfileImage);
router.put("/profile/update-image", verifyToken, updateProfileImage);
router.delete("/profile/remove-image", verifyToken, removeProfileImage);

export default router;