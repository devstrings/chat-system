import express from "express";
import multer from "multer";
import {
  createGroup,
  getUserGroups,
  getGroupDetails,
  addGroupMembers,
  removeGroupMember,
  leaveGroup,
  makeAdmin,
  removeAdmin,
  updateGroupImage,
  removeGroupImage,
  deleteGroup,
  updateGroup,
  pinGroup,
  unpinGroup,
  archiveGroup,
  unarchiveGroup,
  clearGroupChat,
  serveGroupImage,
    editGroupMessage
} from "../controllers/group.controller.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// MULTER SETUP FOR GROUP IMAGE
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/groupImages/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only images allowed"));
    }
  },
});

/**
 * @swagger
 * /groups/create:
 *   post:
 *     summary: Create a new group
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Group created successfully
 */
router.post("/create", verifyToken, createGroup);

/**
 * @swagger
 * /groups/list:
 *   get:
 *     summary: Get all groups of the user
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of groups
 */
router.get("/list", verifyToken, getUserGroups);

/**
 * @swagger
 * /groups/{groupId}:
 *   get:
 *     summary: Get group details
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Group details retrieved
 */
router.get("/:groupId", verifyToken, getGroupDetails);

/**
 * @swagger
 * /groups/{groupId}:
 *   put:
 *     summary: Update group name/description (Admins only)
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Group updated successfully
 */
router.put("/:groupId", verifyToken, updateGroup);

/**
 * @swagger
 * /groups/{groupId}/image:
 *   put:
 *     summary: Update group image (Admins only)
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               groupImage:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Group image updated
 */
router.put("/:groupId/image", verifyToken, upload.single("groupImage"), updateGroupImage);

/**
 * @swagger
 * /groups/{groupId}/image:
 *   delete:
 *     summary: Remove group image (Admins only)
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Group image removed
 */
router.delete("/:groupId/image", verifyToken, removeGroupImage);

/**
 * @swagger
 * /groups/{groupId}/add-members:
 *   post:
 *     summary: Add members to a group (Admins only)
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               members:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Members added
 */
router.post("/:groupId/add-members", verifyToken, addGroupMembers);

/**
 * @swagger
 * /groups/{groupId}/remove/{memberId}:
 *   delete:
 *     summary: Remove a member from group (Admins only)
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Member removed
 */
router.delete("/:groupId/remove/:memberId", verifyToken, removeGroupMember);

/**
 * @swagger
 * /groups/{groupId}/leave:
 *   post:
 *     summary: Leave a group (any member)
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Left the group
 */
router.post("/:groupId/leave", verifyToken, leaveGroup);

/**
 * @swagger
 * /groups/{groupId}/make-admin/{memberId}:
 *   post:
 *     summary: Make a member admin (Admins only)
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Member is now admin
 */
router.post("/:groupId/make-admin/:memberId", verifyToken, makeAdmin);

/**
 * @swagger
 * /groups/{groupId}/remove-admin/{memberId}:
 *   delete:
 *     summary: Remove admin (Creator/Admins only)
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Admin removed
 */
router.delete("/:groupId/remove-admin/:memberId", verifyToken, removeAdmin);

/**
 * @swagger
 * /groups/{groupId}:
 *   delete:
 *     summary: Delete group (Creator only)
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Group deleted
 */
router.delete("/:groupId", verifyToken, deleteGroup);

/**
 * @swagger
 * /groups/{groupId}/pin:
 *   post:
 *     summary: Pin a group
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Group pinned
 */
router.post("/:groupId/pin", verifyToken, pinGroup);

/**
 * @swagger
 * /groups/{groupId}/unpin:
 *   delete:
 *     summary: Unpin a group
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Group unpinned
 */
router.delete("/:groupId/unpin", verifyToken, unpinGroup);

/**
 * @swagger
 * /groups/{groupId}/archive:
 *   post:
 *     summary: Archive a group
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Group archived
 */
router.post("/:groupId/archive", verifyToken, archiveGroup);

/**
 * @swagger
 * /groups/{groupId}/unarchive:
 *   delete:
 *     summary: Unarchive a group
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Group unarchived
 */
router.delete("/:groupId/unarchive", verifyToken, unarchiveGroup);

/**
 * @swagger
 * /groups/{groupId}/clear:
 *   delete:
 *     summary: Clear group chat
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Group chat cleared
 */
router.delete("/:groupId/clear", verifyToken, clearGroupChat);

/**
 * @swagger
 * /groups/image/{filename}:
 *   get:
 *     summary: Serve group image
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Image served
 */
router.get("/image/:filename", verifyToken, serveGroupImage);
/**
 * @swagger
 * /groups/message/{messageId}:
 *   put:
 *     summary: Edit a group message
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               text:
 *                 type: string
 *     responses:
 *       200:
 *         description: Message edited successfully
 */
router.put("/message/:messageId", verifyToken, editGroupMessage);  

export default router;

