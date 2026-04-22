import express from "express";
import { authController, messageController, groupController, userController } from "#controllers";
import { search } from "#controllers/ai.controller";
import { basicAuth } from "#middleware/basicAuth";
import { verifyPAT } from "#middleware/verifyPAT";
import { requireFeatureEnabled } from "#middleware/requireFeatureEnabled";
import {
  validateConversationExists,
  validateConversationParticipant,
  validateGroupExists,
  validateGroupMember,
} from "#middleware/validation.middleware";

const router = express.Router();


router.get("/auth/me", authController.getCurrentUser);
router.get("/messages/conversations", messageController.getUserConversations);
router.get(
  "/messages/:conversationId",
  validateConversationExists,
  validateConversationParticipant,
  messageController.getMessages,
);
router.get(
  "/messages/group/:groupId",
  validateGroupExists,
  validateGroupMember,
  messageController.getGroupMessages,
);
router.post("/messages/send", messageController.sendMessage);
router.post("/ai/search", requireFeatureEnabled("smartSearch"), search);
router.get("/groups/list", groupController.getUserGroups);
router.get(
  "/groups/:groupId",
  validateGroupExists,
  validateGroupMember,
  groupController.getGroupDetails,
);
router.get("/users/search", userController.searchUsers);
router.get("/users/:id", userController.getUserById);

export default router;
