import express from "express";
import { userController } from "#controllers";
import { verifyToken } from "#middleware/authMiddleware";
import { uploadProfile } from "#config/multer";
import { validate } from "#middleware/validate";  
import {
  searchQueryValidation,
  profileImageUrlValidation,
} from "#validators";
import {
  validateSearchQuery,
  validateUserNotBlocked,
  validateFileUploaded,
  validateProfileImageUrl,  
} from "#middleware/validation.middleware";

const router = express.Router();

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Get all users
 *     tags: [Users]
 */
router.get("/", verifyToken, userController.getUsers);

/**
 * @swagger
 * /users/search:
 *   get:
 *     summary: Search users by query
 *     tags: [Users]
 */
router.get("/search", verifyToken, validateSearchQuery, userController.searchUsers);

/**
 * @swagger
 * /users/auth/me:
 *   get:
 *     summary: Get current authenticated user
 *     tags: [Users]
 */
router.get("/auth/me", verifyToken, userController.getCurrentUser);

/**
 * @swagger
 * /users/image/{filename}:
 *   get:
 *     summary: Serve user profile image
 *     tags: [Users]
 */
router.get("/image/:filename", verifyToken, userController.serveProfileImage);

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
  userController.uploadProfileImage
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
  userController.updateProfileImage
);

/**
 * @swagger
 * /users/profile/remove-image:
 *   delete:
 *     summary: Remove profile image
 *     tags: [Users]
 */
router.delete("/profile/remove-image", verifyToken, userController.removeProfileImage);

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
  userController.uploadCoverPhoto
);

/**
 * @swagger
 * /users/profile/remove-cover:
 *   delete:
 *     summary: Remove cover photo
 *     tags: [Users]
 */
router.delete("/profile/remove-cover", verifyToken, userController.removeCoverPhoto);

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Users]
 */
router.get("/:id", verifyToken, validateUserNotBlocked, userController.getUserById);

export default router;