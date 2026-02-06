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
} from "../controllers/user.controller.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { uploadProfile } from "../config/multer.js"; 

const router = express.Router();

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Get all users
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users
 */
router.get("/", verifyToken, getUsers);

/**
 * @swagger
 * /users/search:
 *   get:
 *     summary: Search users by query
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search keyword
 *     responses:
 *       200:
 *         description: List of matching users
 */
router.get("/search", verifyToken, searchUsers);

/**
 * @swagger
 * /users/auth/me:
 *   get:
 *     summary: Get current authenticated user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user data
 */
router.get("/auth/me", verifyToken, getCurrentUser);

/**
 * @swagger
 * /users/image/{filename}:
 *   get:
 *     summary: Serve user profile image
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *         description: Image filename
 *     responses:
 *       200:
 *         description: Image served
 */
router.get("/image/:filename", verifyToken, serveProfileImage);

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User data retrieved successfully
 *       404:
 *         description: User not found
 */
router.get("/:id", verifyToken, getUserById);

/**
 * @swagger
 * /users/profile/upload:
 *   post:
 *     summary: Upload profile image
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Profile image uploaded
 */
router.post("/profile/upload", verifyToken, uploadProfile.single("image"), uploadProfileImage);

/**
 * @swagger
 * /users/profile/update-image:
 *   put:
 *     summary: Update profile image
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile image updated
 */
router.put("/profile/update-image", verifyToken, updateProfileImage);

/**
 * @swagger
 * /users/profile/remove-image:
 *   delete:
 *     summary: Remove profile image
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile image removed
 */
router.delete("/profile/remove-image", verifyToken, removeProfileImage);

/**
 * @swagger
 * /users/profile/upload-cover:
 *   post:
 *     summary: Upload cover photo
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               coverPhoto:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Cover photo uploaded
 */
router.post("/profile/upload-cover", verifyToken, uploadProfile.single("coverPhoto"), uploadCoverPhoto);

/**
 * @swagger
 * /users/profile/remove-cover:
 *   delete:
 *     summary: Remove cover photo
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cover photo removed
 */
router.delete("/profile/remove-cover", verifyToken, removeCoverPhoto);

export default router;
