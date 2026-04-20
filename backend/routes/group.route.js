import express from "express";
import multer from "multer";
import { groupController } from "#controllers";
import { verifyToken } from "#middleware/authMiddleware";
import { validate } from "#middleware/validate";
import {
  createGroupValidation,
  addMembersValidation,
  editGroupMessageValidation,
} from "#validators";
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
} from "#middleware/validation.middleware";

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
  groupController.createGroup
);

/**
 * @swagger
 * /groups/list:
 *   get:
 *     summary: Get all groups of the user
 *     tags: [Groups]
 */
router.get("/list", verifyToken, groupController.getUserGroups);

/**
 * @swagger
 * /groups/image/{filename}:
 *   get:
 *     summary: Serve group image
 *     tags: [Groups]
 */
router.get("/image/:filename", verifyToken, validateFilename, groupController.serveGroupImage);

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
  groupController.editGroupMessage
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
  groupController.getGroupDetails
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
  groupController.updateGroup
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
  groupController.updateGroupImage
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
  groupController.removeGroupImage
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
  groupController.addGroupMembers
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
  groupController.removeGroupMember
);

/**
 * @swagger
 * /groups/{groupId}/leave:
 *   post:
 *     summary: Leave a group (any member)
 *     tags: [Groups]
 */
router.post("/:groupId/leave", verifyToken, validateGroupExists, groupController.leaveGroup);

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
  groupController.makeAdmin
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
  groupController.removeAdmin
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
  groupController.deleteGroup
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
  groupController.pinGroup
);

/**
 * @swagger
 * /groups/{groupId}/unpin:
 *   delete:
 *     summary: Unpin a group
 *     tags: [Groups]
 */
router.delete("/:groupId/unpin", verifyToken, validateGroupExists, groupController.unpinGroup);

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
  groupController.archiveGroup
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
  groupController.unarchiveGroup
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
  groupController.clearGroupChat
);

export default router;