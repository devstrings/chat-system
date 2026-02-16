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
  editGroupMessage,
} from "../controllers/group.controller.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { validate } from "../validators/middleware/validate.js";
import {
  createGroupValidation,
  addMembersValidation,
  editGroupMessageValidation,
} from "../validators/index.js";
import {
  validateGroupExists,
  validateGroupMember,
  validateGroupAdmin,
  validateGroupCreator,
  validateNotGroupCreator,
  validateGroupPinLimit,
  validateGroupArchive,
  validateMemberIsInGroup,
  validateMemberIsNotAdmin,
  validateMemberIsAdmin,
  validateGroupMessageSender,
  validateGroupMessageText,
  validateFileUploaded,
  validateFilename,
} from "../validators/middleware/validation.middleware.js";

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
 */
router.post(
  "/create",
  verifyToken,
  createGroupValidation,
  validate,
  createGroup
);

/**
 * @swagger
 * /groups/list:
 *   get:
 *     summary: Get all groups of the user
 *     tags: [Groups]
 */
router.get("/list", verifyToken, getUserGroups);

/**
 * @swagger
 * /groups/image/{filename}:
 *   get:
 *     summary: Serve group image
 *     tags: [Groups]
 */
router.get("/image/:filename", verifyToken, validateFilename, serveGroupImage);

/**
 * @swagger
 * /groups/message/{messageId}:
 *   put:
 *     summary: Edit a group message
 *     tags: [Groups]
 */
router.put(
  "/message/:messageId",
  verifyToken,
  editGroupMessageValidation,
  validate,
  validateGroupMessageSender,
  validateGroupMessageText,
  editGroupMessage
);

/**
 * @swagger
 * /groups/{groupId}:
 *   get:
 *     summary: Get group details
 *     tags: [Groups]
 */
router.get(
  "/:groupId",
  verifyToken,
  validateGroupExists,
  validateGroupMember,
  getGroupDetails
);

/**
 * @swagger
 * /groups/{groupId}:
 *   put:
 *     summary: Update group name/description (Admins only)
 *     tags: [Groups]
 */
router.put(
  "/:groupId",
  verifyToken,
  validateGroupExists,
  validateGroupAdmin,
  updateGroup
);

/**
 * @swagger
 * /groups/{groupId}/image:
 *   put:
 *     summary: Update group image (Admins only)
 *     tags: [Groups]
 */
router.put(
  "/:groupId/image",
  verifyToken,
  upload.single("groupImage"),
  validateFileUploaded,
  validateGroupExists,
  validateGroupAdmin,
  updateGroupImage
);

/**
 * @swagger
 * /groups/{groupId}/image:
 *   delete:
 *     summary: Remove group image (Admins only)
 *     tags: [Groups]
 */
router.delete(
  "/:groupId/image",
  verifyToken,
  validateGroupExists,
  validateGroupAdmin,
  removeGroupImage
);

/**
 * @swagger
 * /groups/{groupId}/add-members:
 *   post:
 *     summary: Add members to a group (Admins only)
 *     tags: [Groups]
 */
router.post(
  "/:groupId/add-members",
  verifyToken,
  addMembersValidation,
  validate,
  validateGroupExists,
  validateGroupAdmin,
  addGroupMembers
);

/**
 * @swagger
 * /groups/{groupId}/remove/{memberId}:
 *   delete:
 *     summary: Remove a member from group (Admins only)
 *     tags: [Groups]
 */
router.delete(
  "/:groupId/remove/:memberId",
  verifyToken,
  validateGroupExists,
  validateGroupAdmin,
  validateNotGroupCreator,
  removeGroupMember
);

/**
 * @swagger
 * /groups/{groupId}/leave:
 *   post:
 *     summary: Leave a group (any member)
 *     tags: [Groups]
 */
router.post("/:groupId/leave", verifyToken, validateGroupExists, leaveGroup);

/**
 * @swagger
 * /groups/{groupId}/make-admin/{memberId}:
 *   post:
 *     summary: Make a member admin (Admins only)
 *     tags: [Groups]
 */
router.post(
  "/:groupId/make-admin/:memberId",
  verifyToken,
  validateGroupExists,
  validateGroupAdmin,
  validateMemberIsInGroup,
  validateMemberIsNotAdmin,
  makeAdmin
);

/**
 * @swagger
 * /groups/{groupId}/remove-admin/{memberId}:
 *   delete:
 *     summary: Remove admin (Creator/Admins only)
 *     tags: [Groups]
 */
router.delete(
  "/:groupId/remove-admin/:memberId",
  verifyToken,
  validateGroupExists,
  validateGroupAdmin,
  validateMemberIsAdmin,
  validateNotGroupCreator,
  removeAdmin
);

/**
 * @swagger
 * /groups/{groupId}:
 *   delete:
 *     summary: Delete group (Creator only)
 *     tags: [Groups]
 */
router.delete(
  "/:groupId",
  verifyToken,
  validateGroupExists,
  validateGroupCreator,
  deleteGroup
);

/**
 * @swagger
 * /groups/{groupId}/pin:
 *   post:
 *     summary: Pin a group
 *     tags: [Groups]
 */
router.post(
  "/:groupId/pin",
  verifyToken,
  validateGroupExists,
  validateGroupMember,
  validateGroupPinLimit,
  pinGroup
);

/**
 * @swagger
 * /groups/{groupId}/unpin:
 *   delete:
 *     summary: Unpin a group
 *     tags: [Groups]
 */
router.delete("/:groupId/unpin", verifyToken, validateGroupExists, unpinGroup);

/**
 * @swagger
 * /groups/{groupId}/archive:
 *   post:
 *     summary: Archive a group
 *     tags: [Groups]
 */
router.post(
  "/:groupId/archive",
  verifyToken,
  validateGroupExists,
  validateGroupMember,
  validateGroupArchive,
  archiveGroup
);

/**
 * @swagger
 * /groups/{groupId}/unarchive:
 *   delete:
 *     summary: Unarchive a group
 *     tags: [Groups]
 */
router.delete(
  "/:groupId/unarchive",
  verifyToken,
  validateGroupExists,
  unarchiveGroup
);

/**
 * @swagger
 * /groups/{groupId}/clear:
 *   delete:
 *     summary: Clear group chat
 *     tags: [Groups]
 */
router.delete(
  "/:groupId/clear",
  verifyToken,
  validateGroupExists,
  validateGroupMember,
  clearGroupChat
);

export default router;