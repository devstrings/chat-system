import { groupService } from "#services";
import Message from "#models/Message";
import asyncHandler from "express-async-handler";
// CREATE GROUP CONTROLLER
export const createGroup = asyncHandler(async (req, res) => {
  const { name, description, memberIds } = req.body;
  const creatorId = req.user.id;
  const group = await groupService.processCreateGroup(name, description, memberIds, creatorId);
  res.status(201).json(group);
});

// EDIT GROUP MESSAGE CONTROLLER 
export const editGroupMessage = asyncHandler(async (req, res) => {
  const { text } = req.body;
  const message = req.validatedMessage;
  message.text = text.trim();
  message.isEdited = true;
  message.editedAt = new Date();
  await message.save();
  const io = req.app.get("io");
  if (io) {
    io.to(message.groupId.toString()).emit("groupMessageEdited", {
      groupId: message.groupId.toString(),
      messageId: message._id.toString(),
      text: message.text,
      editedAt: message.editedAt
    });
  }
  res.json(message);
});

// GET USER'S GROUPS CONTROLLER
export const getUserGroups = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const groups = await groupService.fetchUserGroups(userId);
  res.json(groups);
});

// GET GROUP DETAILS CONTROLLER
export const getGroupDetails = asyncHandler(async (req, res) => {
  const group = req.validatedGroup;
  res.json(group);
});

// UPDATE GROUP (NAME/DESCRIPTION) CONTROLLER
export const updateGroup = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const { name, description } = req.body;
  const updatedGroup = await groupService.processUpdateGroup(groupId, name, description);
  res.json(updatedGroup);
});
// UPDATE GROUP IMAGE CONTROLLER
export const updateGroupImage = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const updatedGroup = await groupService.processUpdateGroupImage(groupId, req.file);
  res.json(updatedGroup);
});
// REMOVE GROUP IMAGE CONTROLLER
export const removeGroupImage = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const updatedGroup = await groupService.processRemoveGroupImage(groupId);
  res.json(updatedGroup);
});

// ADD MEMBERS CONTROLLER
export const addGroupMembers = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const { memberIds } = req.body;
  const updatedGroup = await groupService.processAddGroupMembers(groupId, memberIds);
  res.json(updatedGroup);
});
// REMOVE MEMBER CONTROLLER
export const removeGroupMember = asyncHandler(async (req, res) => {
  const { groupId, memberId } = req.params;
  const updatedGroup = await groupService.processRemoveGroupMember(groupId, memberId);
  res.json(updatedGroup);
});

// LEAVE GROUP CONTROLLER
export const leaveGroup = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user.id;
  const result = await groupService.processLeaveGroup(groupId, userId);
  res.json(result);
});
// MAKE ADMIN CONTROLLER
export const makeAdmin = asyncHandler(async (req, res) => {
  const { groupId, memberId } = req.params;
  const updatedGroup = await groupService.processMakeAdmin(groupId, memberId);
  res.json(updatedGroup);
});
// REMOVE ADMIN CONTROLLER
export const removeAdmin = asyncHandler(async (req, res) => {
  const { groupId, memberId } = req.params;
  const updatedGroup = await groupService.processRemoveAdmin(groupId, memberId);
  res.json(updatedGroup);
});

// DELETE GROUP CONTROLLER
export const deleteGroup = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const result = await groupService.processDeleteGroup(groupId);
  res.json(result);
});
// PIN GROUP CONTROLLER
export const pinGroup = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user.id;
  const result = await groupService.processPinGroup(groupId, userId);
  res.json(result);
});

// UNPIN GROUP CONTROLLER
export const unpinGroup = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user.id;
  const result = await groupService.processUnpinGroup(groupId, userId);
  res.json(result);
});

// ARCHIVE GROUP CONTROLLER
export const archiveGroup = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user.id;
  const result = await groupService.processArchiveGroup(groupId, userId);
  res.json(result);
});

// UNARCHIVE GROUP CONTROLLER
export const unarchiveGroup = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user.id;
  const result = await groupService.processUnarchiveGroup(groupId, userId);
  res.json(result);
});
// CLEAR GROUP CHAT CONTROLLER
export const clearGroupChat = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user.id;
  const result = await groupService.processClearGroupChat(groupId, userId);
  const io = req.app.get("io");
  if (io) {
    io.to(userId).emit("groupChatCleared", {
      groupId: result.groupId,
      clearedBy: result.userId,
      clearedFor: result.userId,
      action: "clearedForMe"
    });
  }
  res.json({ message: result.message, deletedCount: result.deletedCount });
});

// SERVE GROUP IMAGE CONTROLLER
export const serveGroupImage = asyncHandler(async (req, res) => {
  const filename = req.params.filename;
  const filePath = groupService.findGroupImageFile(filename);
  const mimeType = groupService.getMimeType(filePath);
  res.setHeader("Content-Type", mimeType);
  res.setHeader("Cache-Control", "public, max-age=31536000");
  res.setHeader("Content-Disposition", "inline");
  return res.sendFile(filePath);
});