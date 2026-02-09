
import * as groupService from "../services/group.service.js";
import * as groupValidation from "../validations/group.validation.js";
import Message from "../models/message.js";
// CREATE GROUP CONTROLLER
export const createGroup = async (req, res) => {
  try {
    const { name, description, memberIds } = req.body;
    const creatorId = req.user.id;

    // Validation
    const validation = groupValidation.validateCreateGroup(name, memberIds);
    if (!validation.isValid) {
      return res.status(400).json({ message: validation.message });
    }

    // Service call
    const group = await groupService.processCreateGroup(name, description, memberIds, creatorId);

    res.status(201).json(group);
  } catch (err) {
    console.error("Create group error:", err);
    res.status(500).json({ message: "Failed to create group" });
  }
};
// EDIT GROUP MESSAGE CONTROLLER 
export const editGroupMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { text } = req.body;
    const userId = req.user.id;

    console.log(" Editing group message:", { messageId, userId, text });

    // Validation
    if (!text || !text.trim()) {
      return res.status(400).json({ message: "Message text is required" });
    }

    // Find message
    const message = await Message.findById(messageId);
    
    if (!message) {
      console.log(" Message not found:", messageId);
      return res.status(404).json({ message: "Message not found" });
    }

    // Check if group message
    if (!message.isGroupMessage || !message.groupId) {
      return res.status(400).json({ message: "Not a group message" });
    }

    // Check if user is sender
    if (message.sender.toString() !== userId) {
      console.log(" User not authorized:", { sender: message.sender, userId });
      return res.status(403).json({ message: "Can only edit your own messages" });
    }

    // Update message
    message.text = text.trim();
    message.isEdited = true;
    message.editedAt = new Date();
    await message.save();

    console.log(" Message updated:", message._id);

    // Emit socket event to all group members
    const io = req.app.get("io");
    if (io) {
      const groupId = message.groupId.toString();
      console.log(" Emitting groupMessageEdited to group:", groupId);
      
      io.to(groupId).emit("groupMessageEdited", {
        groupId: groupId,
        messageId: message._id.toString(),
        text: message.text,
        editedAt: message.editedAt
      });
      
      console.log(" Socket event emitted");
    } else {
      console.log(" Socket.io instance not found");
    }

    res.json(message);
  } catch (err) {
    console.error(" Edit group message error:", err);
    res.status(500).json({ message: "Failed to edit message" });
  }
};

//  GET USER'S GROUPS CONTROLLER
export const getUserGroups = async (req, res) => {
  try {
    const userId = req.user.id;

    // Service call
    const groups = await groupService.fetchUserGroups(userId);

    res.json(groups);
  } catch (err) {
    console.error(" Get groups error:", err);
    res.status(500).json({ message: "Failed to fetch groups" });
  }
};

// GET GROUP DETAILS CONTROLLER
export const getGroupDetails = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    // Service call
    const group = await groupService.fetchGroupDetails(groupId);

    // Validation
    const groupValidationResult = groupValidation.validateGroupExists(group);
    if (!groupValidationResult.isValid) {
      return res.status(groupValidationResult.statusCode).json({ message: groupValidationResult.message });
    }

    const memberValidation = groupValidation.validateIsMember(group, userId);
    if (!memberValidation.isValid) {
      return res.status(memberValidation.statusCode).json({ message: memberValidation.message });
    }

    res.json(group);
  } catch (err) {
    console.error(" Get group details error:", err);
    res.status(500).json({ message: "Failed to fetch group details" });
  }
};

//  UPDATE GROUP (NAME/DESCRIPTION) CONTROLLER
export const updateGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { name, description } = req.body;
    const userId = req.user.id;

    const group = await groupService.fetchGroupById(groupId);

    // Validation
    const groupValidationResult = groupValidation.validateGroupExists(group);
    if (!groupValidationResult.isValid) {
      return res.status(groupValidationResult.statusCode).json({ message: groupValidationResult.message });
    }

    const adminValidation = groupValidation.validateIsAdmin(group, userId);
    if (!adminValidation.isValid) {
      return res.status(adminValidation.statusCode).json({ message: "Only admins can update group" });
    }

    // Service call
    const updatedGroup = await groupService.processUpdateGroup(groupId, name, description);

    res.json(updatedGroup);
  } catch (err) {
    console.error(" Update group error:", err);
    res.status(500).json({ message: "Failed to update group" });
  }
};

//  UPDATE GROUP IMAGE CONTROLLER
export const updateGroupImage = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    // Validation
    const fileValidation = groupValidation.validateUpdateGroupImage(req.file);
    if (!fileValidation.isValid) {
      return res.status(400).json({ message: fileValidation.message });
    }

    const group = await groupService.fetchGroupById(groupId);

    const groupValidationResult = groupValidation.validateGroupExists(group);
    if (!groupValidationResult.isValid) {
      return res.status(groupValidationResult.statusCode).json({ message: groupValidationResult.message });
    }

    const adminValidation = groupValidation.validateIsAdmin(group, userId);
    if (!adminValidation.isValid) {
      return res.status(adminValidation.statusCode).json({ message: "Only admins can change group picture" });
    }

    // Service call
    const updatedGroup = await groupService.processUpdateGroupImage(groupId, req.file);

    res.json(updatedGroup);
  } catch (err) {
    console.error(" Update group image error:", err);
    res.status(500).json({ message: "Failed to update image" });
  }
};

// REMOVE GROUP IMAGE CONTROLLER
export const removeGroupImage = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    const group = await groupService.fetchGroupById(groupId);

    // Validation
    const groupValidationResult = groupValidation.validateGroupExists(group);
    if (!groupValidationResult.isValid) {
      return res.status(groupValidationResult.statusCode).json({ message: groupValidationResult.message });
    }

    const adminValidation = groupValidation.validateIsAdmin(group, userId);
    if (!adminValidation.isValid) {
      return res.status(adminValidation.statusCode).json({ message: "Only admins can remove group picture" });
    }

    // Service call
    const updatedGroup = await groupService.processRemoveGroupImage(groupId);

    res.json(updatedGroup);
  } catch (err) {
    console.error(" Remove group image error:", err);
    res.status(500).json({ message: "Failed to remove image" });
  }
};

//  ADD MEMBERS CONTROLLER
export const addGroupMembers = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { memberIds } = req.body;
    const userId = req.user.id;

    const group = await groupService.fetchGroupById(groupId);

    // Validation
    const groupValidationResult = groupValidation.validateGroupExists(group);
    if (!groupValidationResult.isValid) {
      return res.status(groupValidationResult.statusCode).json({ message: groupValidationResult.message });
    }

    const adminValidation = groupValidation.validateIsAdmin(group, userId);
    if (!adminValidation.isValid) {
      return res.status(adminValidation.statusCode).json({ message: "Only admins can add members" });
    }

    // Service call
    const updatedGroup = await groupService.processAddGroupMembers(groupId, memberIds);

    res.json(updatedGroup);
  } catch (err) {
    console.error(" Add members error:", err);
    
    if (err.message === "All users are already members") {
      return res.status(400).json({ message: err.message });
    }
    
    res.status(500).json({ message: "Failed to add members" });
  }
};

//  REMOVE MEMBER CONTROLLER
export const removeGroupMember = async (req, res) => {
  try {
    const { groupId, memberId } = req.params;
    const userId = req.user.id;

    const group = await groupService.fetchGroupById(groupId);

    // Validation
    const groupValidationResult = groupValidation.validateGroupExists(group);
    if (!groupValidationResult.isValid) {
      return res.status(groupValidationResult.statusCode).json({ message: groupValidationResult.message });
    }

    const adminValidation = groupValidation.validateIsAdmin(group, userId);
    if (!adminValidation.isValid) {
      return res.status(adminValidation.statusCode).json({ message: "Only admins can remove members" });
    }

    const creatorValidation = groupValidation.validateCannotRemoveCreator(group, memberId);
    if (!creatorValidation.isValid) {
      return res.status(creatorValidation.statusCode).json({ message: creatorValidation.message });
    }

    // Service call
    const updatedGroup = await groupService.processRemoveGroupMember(groupId, memberId);

    res.json(updatedGroup);
  } catch (err) {
    console.error(" Remove member error:", err);
    res.status(500).json({ message: "Failed to remove member" });
  }
};

// LEAVE GROUP CONTROLLER
export const leaveGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    const group = await groupService.fetchGroupById(groupId);

    // Validation
    const groupValidationResult = groupValidation.validateGroupExists(group);
    if (!groupValidationResult.isValid) {
      return res.status(groupValidationResult.statusCode).json({ message: groupValidationResult.message });
    }

    // Service call
    const result = await groupService.processLeaveGroup(groupId, userId);

    res.json(result);
  } catch (err) {
    console.error(" Leave group error:", err);
    res.status(500).json({ message: "Failed to leave group" });
  }
};

//  MAKE ADMIN CONTROLLER
export const makeAdmin = async (req, res) => {
  try {
    const { groupId, memberId } = req.params;
    const userId = req.user.id;

    const group = await groupService.fetchGroupById(groupId);

    // Validation
    const groupValidationResult = groupValidation.validateGroupExists(group);
    if (!groupValidationResult.isValid) {
      return res.status(groupValidationResult.statusCode).json({ message: groupValidationResult.message });
    }

    const adminValidation = groupValidation.validateIsAdmin(group, userId);
    if (!adminValidation.isValid) {
      return res.status(adminValidation.statusCode).json({ message: "Only admins can promote members" });
    }

    const memberValidation = groupValidation.validateIsMemberOfGroup(group, memberId);
    if (!memberValidation.isValid) {
      return res.status(memberValidation.statusCode).json({ message: memberValidation.message });
    }

    const notAdminValidation = groupValidation.validateIsNotAlreadyAdmin(group, memberId);
    if (!notAdminValidation.isValid) {
      return res.status(notAdminValidation.statusCode).json({ message: notAdminValidation.message });
    }

    // Service call
    const updatedGroup = await groupService.processMakeAdmin(groupId, memberId);

    res.json(updatedGroup);
  } catch (err) {
    console.error(" Make admin error:", err);
    res.status(500).json({ message: "Failed to make admin" });
  }
};

//  REMOVE ADMIN CONTROLLER
export const removeAdmin = async (req, res) => {
  try {
    const { groupId, memberId } = req.params;
    const userId = req.user.id;

    const group = await groupService.fetchGroupById(groupId);

    // Validation
    const groupValidationResult = groupValidation.validateGroupExists(group);
    if (!groupValidationResult.isValid) {
      return res.status(groupValidationResult.statusCode).json({ message: groupValidationResult.message });
    }

    // Only creator or other admins can remove admin
    const isCreator = group.creator.toString() === userId;
    const isAdmin = group.admins.some((a) => a.toString() === userId);
    
    if (!isCreator && !isAdmin) {
      return res.status(403).json({ message: "Only creator or admins can demote admins" });
    }

    const creatorValidation = groupValidation.validateCannotDemoteCreator(group, memberId);
    if (!creatorValidation.isValid) {
      return res.status(creatorValidation.statusCode).json({ message: creatorValidation.message });
    }

    const isActuallyAdminValidation = groupValidation.validateIsActuallyAdmin(group, memberId);
    if (!isActuallyAdminValidation.isValid) {
      return res.status(isActuallyAdminValidation.statusCode).json({ message: isActuallyAdminValidation.message });
    }

    // Service call
    const updatedGroup = await groupService.processRemoveAdmin(groupId, memberId);

    res.json(updatedGroup);
  } catch (err) {
    console.error(" Remove admin error:", err);
    res.status(500).json({ message: "Failed to remove admin" });
  }
};

//  DELETE GROUP CONTROLLER
export const deleteGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    const group = await groupService.fetchGroupById(groupId);

    // Validation
    const groupValidationResult = groupValidation.validateGroupExists(group);
    if (!groupValidationResult.isValid) {
      return res.status(groupValidationResult.statusCode).json({ message: groupValidationResult.message });
    }

    const creatorValidation = groupValidation.validateIsCreator(group, userId);
    if (!creatorValidation.isValid) {
      return res.status(creatorValidation.statusCode).json({ message: "Only creator can delete group" });
    }

    // Service call
    const result = await groupService.processDeleteGroup(groupId);

    res.json(result);
  } catch (err) {
    console.error(" Delete group error:", err);
    res.status(500).json({ message: "Failed to delete group" });
  }
};

// PIN GROUP CONTROLLER
export const pinGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    const group = await groupService.fetchGroupById(groupId);

    // Validation
    const groupValidationResult = groupValidation.validateGroupExists(group);
    if (!groupValidationResult.isValid) {
      return res.status(groupValidationResult.statusCode).json({ message: groupValidationResult.message });
    }

    const memberValidation = groupValidation.validateIsMember(group, userId);
    if (!memberValidation.isValid) {
      return res.status(memberValidation.statusCode).json({ message: memberValidation.message });
    }

    const pinnedValidation = groupValidation.validateNotAlreadyPinned(group, userId);
    if (!pinnedValidation.isValid) {
      return res.status(pinnedValidation.statusCode).json({ message: pinnedValidation.message });
    }

    // Check pin limit (max 3)
    const userPinnedCount = await groupService.checkUserPinCount(userId);
    const pinLimitValidation = groupValidation.validatePinLimit(userPinnedCount);
    if (!pinLimitValidation.isValid) {
      return res.status(pinLimitValidation.statusCode).json({ message: pinLimitValidation.message });
    }

    // Service call
    const result = await groupService.processPinGroup(groupId, userId);

    res.json(result);
  } catch (err) {
    console.error(" Pin group error:", err);
    res.status(500).json({ message: "Failed to pin group" });
  }
};

// UNPIN GROUP CONTROLLER
export const unpinGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    const group = await groupService.fetchGroupById(groupId);

    // Validation
    const groupValidationResult = groupValidation.validateGroupExists(group);
    if (!groupValidationResult.isValid) {
      return res.status(groupValidationResult.statusCode).json({ message: groupValidationResult.message });
    }

    // Service call
    const result = await groupService.processUnpinGroup(groupId, userId);

    res.json(result);
  } catch (err) {
    console.error(" Unpin group error:", err);
    res.status(500).json({ message: "Failed to unpin group" });
  }
};

// ARCHIVE GROUP CONTROLLER
export const archiveGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    const group = await groupService.fetchGroupById(groupId);

    // Validation
    const groupValidationResult = groupValidation.validateGroupExists(group);
    if (!groupValidationResult.isValid) {
      return res.status(groupValidationResult.statusCode).json({ message: groupValidationResult.message });
    }

    const memberValidation = groupValidation.validateIsMember(group, userId);
    if (!memberValidation.isValid) {
      return res.status(memberValidation.statusCode).json({ message: memberValidation.message });
    }

    const archivedValidation = groupValidation.validateNotAlreadyArchived(group, userId);
    if (!archivedValidation.isValid) {
      return res.status(archivedValidation.statusCode).json({ message: archivedValidation.message });
    }

    // Service call
    const result = await groupService.processArchiveGroup(groupId, userId);

    res.json(result);
  } catch (err) {
    console.error(" Archive group error:", err);
    res.status(500).json({ message: "Failed to archive group" });
  }
};

// UNARCHIVE GROUP CONTROLLER
export const unarchiveGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    const group = await groupService.fetchGroupById(groupId);

    // Validation
    const groupValidationResult = groupValidation.validateGroupExists(group);
    if (!groupValidationResult.isValid) {
      return res.status(groupValidationResult.statusCode).json({ message: groupValidationResult.message });
    }

    // Service call
    const result = await groupService.processUnarchiveGroup(groupId, userId);

    res.json(result);
  } catch (err) {
    console.error(" Unarchive group error:", err);
    res.status(500).json({ message: "Failed to unarchive group" });
  }
};

// CLEAR GROUP CHAT CONTROLLER
export const clearGroupChat = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    const group = await groupService.fetchGroupById(groupId);

    // Validation
    const groupValidationResult = groupValidation.validateGroupExists(group);
    if (!groupValidationResult.isValid) {
      return res.status(groupValidationResult.statusCode).json({ message: groupValidationResult.message });
    }

    const memberValidation = groupValidation.validateIsMember(group, userId);
    if (!memberValidation.isValid) {
      return res.status(memberValidation.statusCode).json({ message: memberValidation.message });
    }

    // Service call
    const result = await groupService.processClearGroupChat(groupId, userId);

    //  GET SOCKET.IO INSTANCE AND EMIT
    const io = req.app.get("io");
    
    if (io) {
      console.log(" EMITTING groupChatCleared EVENT");
      console.log(" Group ID:", groupId);
      console.log(" Cleared by:", userId);
      
      io.to(userId).emit("groupChatCleared", {
        groupId: result.groupId,
        clearedBy: result.userId,
        clearedFor: result.userId,
        action: "clearedForMe"
      });
      
      console.log("Socket event emitted to clearing user only");
    }

    res.json({
      message: result.message,
      deletedCount: result.deletedCount,
    });
  } catch (err) {
    console.error(" Clear group chat error:", err);
    res.status(500).json({ message: "Failed to clear chat" });
  }
};

// SERVE GROUP IMAGE CONTROLLER
export const serveGroupImage = async (req, res) => {
  try {
    const filename = req.params.filename;
    const userId = req.user.id;

    console.log(" Serving group image:", { filename, userId });

    // Validation
    const filenameValidation = groupValidation.validateFilename(filename);
    if (!filenameValidation.isValid) {
      return res.status(400).json({ message: filenameValidation.message });
    }

    // Service call
    const filePath = groupService.findGroupImageFile(filename);
    const mimeType = groupService.getMimeType(filePath);

    // Set headers and send file
    res.setHeader("Content-Type", mimeType);
    res.setHeader("Cache-Control", "public, max-age=31536000");
    res.setHeader("Content-Disposition", "inline");

    return res.sendFile(filePath);
  } catch (error) {
    console.error(" Group image serve error:", error);
    
    if (error.message === "Image not found") {
      return res.status(404).json({ message: error.message });
    }
    
    res.status(500).json({ message: "Failed to serve image" });
  }
};