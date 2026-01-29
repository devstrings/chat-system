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

// Create group
router.post("/create", verifyToken, createGroup);

// Get user's groups
router.get("/list", verifyToken, getUserGroups);

// Get group details
router.get("/:groupId", verifyToken, getGroupDetails);

// UPDATE GROUP NAME/DESCRIPTION (ADMINS ONLY)
router.put("/:groupId", verifyToken, updateGroup);

// UPDATE GROUP IMAGE (ADMINS ONLY) - WITH FILE UPLOAD
router.put(
  "/:groupId/image",
  verifyToken,
  upload.single("groupImage"),
  updateGroupImage,
);

// REMOVE GROUP IMAGE (ADMINS ONLY)
router.delete("/:groupId/image", verifyToken, removeGroupImage);

// Add members (ADMINS ONLY)
router.post("/:groupId/add-members", verifyToken, addGroupMembers);

// Remove member (ADMINS ONLY)
router.delete("/:groupId/remove/:memberId", verifyToken, removeGroupMember);

//  LEAVE GROUP (ANY MEMBER) - POST METHOD
router.post("/:groupId/leave", verifyToken, leaveGroup);

// Make admin (ADMINS ONLY)
router.post("/:groupId/make-admin/:memberId", verifyToken, makeAdmin);
//  Remove admin (CREATOR/ADMINS ONLY)
router.delete("/:groupId/remove-admin/:memberId", verifyToken, removeAdmin);
// DELETE GROUP (CREATOR ONLY)
router.delete("/:groupId", verifyToken, deleteGroup);
// PIN/UNPIN GROUP
router.post("/:groupId/pin", verifyToken, pinGroup);
router.delete("/:groupId/unpin", verifyToken, unpinGroup);

// ARCHIVE/UNARCHIVE GROUP
router.post("/:groupId/archive", verifyToken, archiveGroup);
router.delete("/:groupId/unarchive", verifyToken, unarchiveGroup);

// CLEAR GROUP CHAT
router.delete("/:groupId/clear", verifyToken, clearGroupChat);

router.get("/image/:filename", verifyToken, serveGroupImage);

export default router;
