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
  removeCoverPhoto,
} from "../controllers/user.controller.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { uploadProfile } from "../config/multer.js";
import { validate } from "../validators/middleware/validate.js";  
import {
  searchQueryValidation,
  profileImageUrlValidation,
} from "../validators/index.js";
import {
  validateSearchQuery,
  validateUserNotBlocked,
  validateFileUploaded,
  validateProfileImageUrl,  
} from "../validators/middleware/validation.middleware.js";

const router = express.Router();

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Get all users
 *     tags: [Users]
 */
router.get("/", verifyToken, getUsers);

/**
 * @swagger
 * /users/search:
 *   get:
 *     summary: Search users by query
 *     tags: [Users]
 */
router.get("/search", verifyToken, validateSearchQuery, searchUsers);

/**
 * @swagger
 * /users/auth/me:
 *   get:
 *     summary: Get current authenticated user
 *     tags: [Users]
 */
router.get("/auth/me", verifyToken, getCurrentUser);

/**
 * @swagger
 * /users/image/{filename}:
 *   get:
 *     summary: Serve user profile image
 *     tags: [Users]
 */
router.get("/image/:filename", verifyToken, serveProfileImage);

/**
 * @swagger
 * /users/profile/upload:
 *   post:
 *     summary: Upload profile image
 *     tags: [Users]
 */
router.post(
  "/profile/upload",
  verifyToken,
  uploadProfile.single("image"),
  validateFileUploaded,
  uploadProfileImage
);

/**
 * @swagger
 * /users/profile/update-image:
 *   put:
 *     summary: Update profile image
 *     tags: [Users]
 */
router.put(
  "/profile/update-image",
  verifyToken,
  profileImageUrlValidation,  
  validate,                    
  validateProfileImageUrl,     
  updateProfileImage
);

/**
 * @swagger
 * /users/profile/remove-image:
 *   delete:
 *     summary: Remove profile image
 *     tags: [Users]
 */
router.delete("/profile/remove-image", verifyToken, removeProfileImage);

/**
 * @swagger
 * /users/profile/upload-cover:
 *   post:
 *     summary: Upload cover photo
 *     tags: [Users]
 */
router.post(
  "/profile/upload-cover",
  verifyToken,
  uploadProfile.single("coverPhoto"),
  validateFileUploaded,
  uploadCoverPhoto
);

/**
 * @swagger
 * /users/profile/remove-cover:
 *   delete:
 *     summary: Remove cover photo
 *     tags: [Users]
 */
router.delete("/profile/remove-cover", verifyToken, removeCoverPhoto);

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Users]
 */
router.get("/:id", verifyToken, validateUserNotBlocked, getUserById);

export default router;