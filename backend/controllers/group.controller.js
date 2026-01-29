import Group from "../models/Group.js";
import user from "../models/user.js";
import Message from "../models/message.js";
import fs from "fs";
import path from "path";

// CREATE GROUP
export const createGroup = async (req, res) => {
  try {
    const { name, description, memberIds } = req.body;
    const creatorId = req.user.id;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Group name is required" });
    }

    if (!memberIds || memberIds.length === 0) {
      return res.status(400).json({ message: "At least one member required" });
    }

    const group = await Group.create({
      name: name.trim(),
      description: description?.trim() || "",
      creator: creatorId,
      admins: [creatorId],
      members: [creatorId, ...memberIds],
    });

    await group.populate("members", "username email profileImage");

    console.log(" Group created:", group._id);
    res.status(201).json(group);
  } catch (err) {
    console.error("Create group error:", err);
    res.status(500).json({ message: "Failed to create group" });
  }
};

//  GET USER'S GROUPS
export const getUserGroups = async (req, res) => {
  try {
    const userId = req.user.id;

    const groups = await Group.find({ members: userId })
      .populate("members", "username email profileImage")
      .populate("lastMessageSender", "username")
      .populate("creator", "username")
      .sort({ lastMessageTime: -1 });

    console.log(` Found ${groups.length} groups for user ${userId}`);
    res.json(groups);
  } catch (err) {
    console.error(" Get groups error:", err);
    res.status(500).json({ message: "Failed to fetch groups" });
  }
};

// GET GROUP DETAILS
export const getGroupDetails = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    const group = await Group.findById(groupId)
      .populate("members", "username email profileImage")
      .populate("admins", "username email")
      .populate("creator", "username email");

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    if (!group.members.some((m) => m._id.toString() === userId)) {
      return res.status(403).json({ message: "Not a member" });
    }

    res.json(group);
  } catch (err) {
    console.error(" Get group details error:", err);
    res.status(500).json({ message: "Failed to fetch group details" });
  }
};

//  UPDATE GROUP (NAME/DESCRIPTION) - ADMINS ONLY
export const updateGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { name, description } = req.body;
    const userId = req.user.id;

    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    //  CHECK IF USER IS ADMIN
    const isAdmin = group.admins.some((a) => a.toString() === userId);
    if (!isAdmin) {
      return res.status(403).json({ message: "Only admins can update group" });
    }

    if (name && name.trim()) {
      group.name = name.trim();
    }

    if (description !== undefined) {
      group.description = description.trim();
    }

    await group.save();
    await group.populate(
      "members admins creator",
      "username email profileImage"
    );

    console.log(` Updated group ${groupId}`);
    res.json(group);
  } catch (err) {
    console.error(" Update group error:", err);
    res.status(500).json({ message: "Failed to update group" });
  }
};

//  UPDATE GROUP IMAGE - ADMINS ONLY (WITH FILE UPLOAD)
export const updateGroupImage = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json({ message: "No image file provided" });
    }

    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // CHECK IF USER IS ADMIN
    const isAdmin = group.admins.some((a) => a.toString() === userId);
    if (!isAdmin) {
      return res
        .status(403)
        .json({ message: "Only admins can change group picture" });
    }

    // Delete old image if exists
    if (group.groupImage) {
      const oldImagePath = path.join(
        "uploads/groupImages/",
        path.basename(group.groupImage)
      );
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    }

    // Save new image path
    group.groupImage = `/uploads/groupImages/${req.file.filename}`;
    await group.save();
    await group.populate(
      "members admins creator",
      "username email profileImage"
    );

    console.log(` Updated group image ${groupId}`);
    res.json(group);
  } catch (err) {
    console.error(" Update group image error:", err);
    res.status(500).json({ message: "Failed to update image" });
  }
};

// REMOVE GROUP IMAGE - ADMINS ONLY
export const removeGroupImage = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    //  CHECK IF USER IS ADMIN
    const isAdmin = group.admins.some((a) => a.toString() === userId);
    if (!isAdmin) {
      return res
        .status(403)
        .json({ message: "Only admins can remove group picture" });
    }

    // Delete image file
    if (group.groupImage) {
      const imagePath = path.join(
        "uploads/groupImages/",
        path.basename(group.groupImage)
      );
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    group.groupImage = null;
    await group.save();
    await group.populate(
      "members admins creator",
      "username email profileImage"
    );

    console.log(` Removed group image ${groupId}`);
    res.json(group);
  } catch (err) {
    console.error(" Remove group image error:", err);
    res.status(500).json({ message: "Failed to remove image" });
  }
};
//  ADD MEMBERS - ADMINS ONLY
export const addGroupMembers = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { memberIds } = req.body;
    const userId = req.user.id;

    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    const isAdmin = group.admins.some((a) => a.toString() === userId);
    if (!isAdmin) {
      return res.status(403).json({ message: "Only admins can add members" });
    }

    // Simply add new members without checking if they exist
    const newMembers = memberIds.filter(
      (id) => !group.members.some((m) => m.toString() === id)
    );

    if (newMembers.length === 0) {
      return res.status(400).json({ message: "All users are already members" });
    }

    // Add members back (even if previously removed)
    group.members.push(...newMembers);
    await group.save();
    await group.populate(
      "members admins creator",
      "username email profileImage"
    );

    console.log(` Added ${newMembers.length} members to group ${groupId}`);
    res.json(group);
  } catch (err) {
    console.error(" Add members error:", err);
    res.status(500).json({ message: "Failed to add members" });
  }
};
//  REMOVE MEMBER - ADMINS ONLY
export const removeGroupMember = async (req, res) => {
  try {
    const { groupId, memberId } = req.params;
    const userId = req.user.id;

    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    //  CHECK IF USER IS ADMIN
    const isAdmin = group.admins.some((a) => a.toString() === userId);
    if (!isAdmin) {
      return res
        .status(403)
        .json({ message: "Only admins can remove members" });
    }

    //  CANNOT REMOVE CREATOR
    if (group.creator.toString() === memberId) {
      return res.status(403).json({ message: "Cannot remove group creator" });
    }

    group.members = group.members.filter((m) => m.toString() !== memberId);
    group.admins = group.admins.filter((a) => a.toString() !== memberId);

    await group.save();
    await group.populate(
      "members admins creator",
      "username email profileImage"
    );

    console.log(` Removed member ${memberId} from group ${groupId}`);
    res.json(group);
  } catch (err) {
    console.error(" Remove member error:", err);
    res.status(500).json({ message: "Failed to remove member" });
  }
};

// LEAVE GROUP - ANY MEMBER CAN LEAVE
export const leaveGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // IF CREATOR LEAVES, TRANSFER OWNERSHIP OR DELETE GROUP
    if (group.creator.toString() === userId) {
      if (group.members.length === 1) {
        // Last member leaving, delete group
        await Group.findByIdAndDelete(groupId);
        console.log(` Deleted empty group ${groupId}`);
        return res.json({ message: "Group deleted", deleted: true });
      } else {
        // Transfer ownership to first admin or first member
        const newCreator =
          group.admins.find((a) => a.toString() !== userId) ||
          group.members.find((m) => m.toString() !== userId);
        group.creator = newCreator;

        if (!group.admins.some((a) => a.toString() === newCreator.toString())) {
          group.admins.push(newCreator);
        }
      }
    }

    // Remove from members and admins
    group.members = group.members.filter((m) => m.toString() !== userId);
    group.admins = group.admins.filter((a) => a.toString() !== userId);

    await group.save();

    console.log(` User ${userId} left group ${groupId}`);
    res.json({ message: "Left group successfully" });
  } catch (err) {
    console.error(" Leave group error:", err);
    res.status(500).json({ message: "Failed to leave group" });
  }
};

//  MAKE ADMIN - ADMINS ONLY
export const makeAdmin = async (req, res) => {
  try {
    const { groupId, memberId } = req.params;
    const userId = req.user.id;

    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    //  CHECK IF USER IS ADMIN
    const isAdmin = group.admins.some((a) => a.toString() === userId);
    if (!isAdmin) {
      return res
        .status(403)
        .json({ message: "Only admins can promote members" });
    }

    if (!group.members.some((m) => m.toString() === memberId)) {
      return res.status(400).json({ message: "User is not a member" });
    }

    if (group.admins.some((a) => a.toString() === memberId)) {
      return res.status(400).json({ message: "User is already an admin" });
    }

    group.admins.push(memberId);
    await group.save();
    await group.populate(
      "members admins creator",
      "username email profileImage"
    );

    console.log(`Made ${memberId} admin in group ${groupId}`);
    res.json(group);
  } catch (err) {
    console.error(" Make admin error:", err);
    res.status(500).json({ message: "Failed to make admin" });
  }
};
//  REMOVE ADMIN (DEMOTE TO MEMBER) - CREATOR OR OTHER ADMINS
export const removeAdmin = async (req, res) => {
  try {
    const { groupId, memberId } = req.params;
    const userId = req.user.id;

    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Only creator or other admins can remove admin
    const isCreator = group.creator.toString() === userId;
    const isAdmin = group.admins.some((a) => a.toString() === userId);
    
    if (!isCreator && !isAdmin) {
      return res.status(403).json({ message: "Only creator or admins can demote admins" });
    }

    // Cannot remove creator as admin
    if (group.creator.toString() === memberId) {
      return res.status(400).json({ message: "Cannot demote group creator" });
    }

    // Check if user is actually an admin
    if (!group.admins.some((a) => a.toString() === memberId)) {
      return res.status(400).json({ message: "User is not an admin" });
    }

    // Remove from admins array (demote to regular member)
    group.admins = group.admins.filter((a) => a.toString() !== memberId);
    
    await group.save();
    await group.populate("members admins creator", "username email profileImage");

    console.log(`Removed ${memberId} from admin in group ${groupId}`);
    res.json(group);
  } catch (err) {
    console.error(" Remove admin error:", err);
    res.status(500).json({ message: "Failed to remove admin" });
  }
};

//  DELETE GROUP - CREATOR ONLY
export const deleteGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    //  ONLY CREATOR CAN DELETE
    if (group.creator.toString() !== userId) {
      return res.status(403).json({ message: "Only creator can delete group" });
    }

    // Delete group image if exists
    if (group.groupImage) {
      const imagePath = path.join(
        "uploads/groupImages/",
        path.basename(group.groupImage)
      );
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await Group.findByIdAndDelete(groupId);

    // Delete all group messages
    await Message.deleteMany({ groupId });

    console.log(` Deleted group ${groupId}`);
    res.json({ message: "Group deleted successfully" });
  } catch (err) {
    console.error(" Delete group error:", err);
    res.status(500).json({ message: "Failed to delete group" });
  }
};
// PIN GROUP
export const pinGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    if (!group.members.includes(userId)) {
      return res.status(403).json({ message: "Not a member" });
    }

    const alreadyPinned = group.pinnedBy.some(
      (p) => p.userId.toString() === userId
    );
    if (alreadyPinned) {
      return res.status(400).json({ message: "Already pinned" });
    }

    // Check pin limit (max 3)
    const userPinnedCount = await Group.countDocuments({
      "pinnedBy.userId": userId,
    });
    if (userPinnedCount >= 3) {
      return res
        .status(400)
        .json({ message: "Maximum 3 groups can be pinned" });
    }

    group.pinnedBy.push({ userId, pinnedAt: new Date() });
    await group.save();

    console.log(` Group pinned: ${groupId} by ${userId}`);
    res.json({ message: "Group pinned successfully", group });
  } catch (err) {
    console.error(" Pin group error:", err);
    res.status(500).json({ message: "Failed to pin group" });
  }
};

// UNPIN GROUP
export const unpinGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    group.pinnedBy = group.pinnedBy.filter(
      (p) => p.userId.toString() !== userId
    );
    await group.save();

    console.log(` Group unpinned: ${groupId} by ${userId}`);
    res.json({ message: "Group unpinned successfully", group });
  } catch (err) {
    console.error(" Unpin group error:", err);
    res.status(500).json({ message: "Failed to unpin group" });
  }
};

// ARCHIVE GROUP
export const archiveGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    if (!group.members.includes(userId)) {
      return res.status(403).json({ message: "Not a member" });
    }

    const alreadyArchived = group.archivedBy.some(
      (a) => a.userId.toString() === userId
    );
    if (alreadyArchived) {
      return res.status(400).json({ message: "Already archived" });
    }

    group.archivedBy.push({ userId, archivedAt: new Date() });
    await group.save();

    console.log(` Group archived: ${groupId} by ${userId}`);
    res.json({ message: "Group archived successfully", group });
  } catch (err) {
    console.error(" Archive group error:", err);
    res.status(500).json({ message: "Failed to archive group" });
  }
};

// UNARCHIVE GROUP
export const unarchiveGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    group.archivedBy = group.archivedBy.filter(
      (a) => a.userId.toString() !== userId
    );
    await group.save();

    console.log(` Group unarchived: ${groupId} by ${userId}`);
    res.json({ message: "Group unarchived successfully", group });
  } catch (err) {
    console.error(" Unarchive group error:", err);
    res.status(500).json({ message: "Failed to unarchive group" });
  }
};

// CLEAR GROUP CHAT
export const clearGroupChat = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    if (!group.members.includes(userId)) {
      return res.status(403).json({ message: "Not a member" });
    }

    const result = await Message.deleteMany({ groupId, isGroupMessage: true });

    await Group.findByIdAndUpdate(groupId, {
      lastMessage: "",
      lastMessageTime: Date.now(),
      lastMessageSender: null,
    });

    console.log(
      ` Cleared ${result.deletedCount} messages from group ${groupId}`
    );
    res.json({
      message: "Group chat cleared",
      deletedCount: result.deletedCount,
    });
  } catch (err) {
    console.error(" Clear group chat error:", err);
    res.status(500).json({ message: "Failed to clear chat" });
  }
};
// ADD THIS FUNCTION - Serve Group Images
export const serveGroupImage = async (req, res) => {
  try {
    const filename = req.params.filename;
    const userId = req.user.id;

    console.log(" Serving group image:", { filename, userId });

    // Prevent path traversal attacks
    if (
      filename.includes("..") ||
      filename.includes("/") ||
      filename.includes("\\")
    ) {
      return res.status(400).json({ message: "Invalid filename" });
    }

    // Remove query strings (cache-busting timestamps)
    const cleanFilename = filename.split("?")[0];

    // Try multiple possible file paths
    const possiblePaths = [
      path.join(process.cwd(), "uploads", "groupImages", cleanFilename),
      path.join(process.cwd(), "uploads", cleanFilename),
    ];

    let filePath = null;
    for (const tryPath of possiblePaths) {
      if (fs.existsSync(tryPath)) {
        filePath = tryPath;
        console.log(" Group image found at:", filePath);
        break;
      }
    }

    if (!filePath) {
      console.error(" Group image not found:", cleanFilename);
      return res.status(404).json({ message: "Image not found" });
    }

    // Determine MIME type
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".webp": "image/webp",
      ".jfif": "image/jpeg",
    };

    // Set headers and send file
    res.setHeader("Content-Type", mimeTypes[ext] || "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=31536000");
    res.setHeader("Content-Disposition", "inline");

    return res.sendFile(filePath);
  } catch (error) {
    console.error(" Group image serve error:", error);
    res.status(500).json({ message: "Failed to serve image" });
  }
};
