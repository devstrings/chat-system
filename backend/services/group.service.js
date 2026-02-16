import Group from "../models/Group.js";
import user from "../models/User.js";
import Message from "../models/Message.js";
import fs from "fs";
import path from "path";

// CREATE GROUP SERVICE
export const processCreateGroup = async (
  name,
  description,
  memberIds,
  creatorId,
) => {
  const group = await Group.create({
    name: name.trim(),
    description: description?.trim() || "",
    creator: creatorId,
    admins: [creatorId],
    members: [creatorId, ...memberIds],
  });

  await group.populate("members", "username email profileImage");

  console.log(" Group created:", group._id);
  return group;
};

// GET USER'S GROUPS SERVICE
export const fetchUserGroups = async (userId) => {
  const groups = await Group.find({ members: userId })
    .populate("members", "username email profileImage")
    .populate("lastMessageSender", "username")
    .populate("creator", "username")
    .sort({ lastMessageTime: -1 });

  console.log(` Found ${groups.length} groups for user ${userId}`);
  return groups;
};

// GET GROUP DETAILS SERVICE
export const fetchGroupDetails = async (groupId) => {
  const group = await Group.findById(groupId)
    .populate("members", "username email profileImage")
    .populate("admins", "username email")
    .populate("creator", "username email");

  return group;
};

// UPDATE GROUP SERVICE
export const processUpdateGroup = async (groupId, name, description) => {
  const group = await Group.findById(groupId);

  if (name && name.trim()) {
    group.name = name.trim();
  }

  if (description !== undefined) {
    group.description = description.trim();
  }

  await group.save();
  await group.populate("members admins creator", "username email profileImage");

  console.log(` Updated group ${groupId}`);
  return group;
};

// DELETE OLD IMAGE SERVICE
export const deleteOldGroupImage = (oldImagePath) => {
  if (oldImagePath) {
    const imagePath = path.join(
      "uploads/groupImages/",
      path.basename(oldImagePath),
    );
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }
  }
};

// UPDATE GROUP IMAGE SERVICE
export const processUpdateGroupImage = async (groupId, file) => {
  const group = await Group.findById(groupId);

  // Delete old image if exists
  if (group.groupImage) {
    deleteOldGroupImage(group.groupImage);
  }

  // Save new image path
  group.groupImage = `/uploads/groupImages/${file.filename}`;
  await group.save();
  await group.populate("members admins creator", "username email profileImage");

  console.log(` Updated group image ${groupId}`);
  return group;
};

// REMOVE GROUP IMAGE SERVICE
export const processRemoveGroupImage = async (groupId) => {
  const group = await Group.findById(groupId);

  // Delete image file
  if (group.groupImage) {
    deleteOldGroupImage(group.groupImage);
  }

  group.groupImage = null;
  await group.save();
  await group.populate("members admins creator", "username email profileImage");

  console.log(` Removed group image ${groupId}`);
  return group;
};

// ADD GROUP MEMBERS SERVICE
export const processAddGroupMembers = async (groupId, memberIds) => {
  const group = await Group.findById(groupId);

  // Simply add new members without checking if they exist
  const newMembers = memberIds.filter(
    (id) => !group.members.some((m) => m.toString() === id),
  );

  if (newMembers.length === 0) {
    throw new Error("All users are already members");
  }

  // Add members back (even if previously removed)
  group.members.push(...newMembers);
  await group.save();
  await group.populate("members admins creator", "username email profileImage");

  console.log(` Added ${newMembers.length} members to group ${groupId}`);
  return group;
};

// REMOVE GROUP MEMBER SERVICE
export const processRemoveGroupMember = async (groupId, memberId) => {
  const group = await Group.findById(groupId);

  group.members = group.members.filter((m) => m.toString() !== memberId);
  group.admins = group.admins.filter((a) => a.toString() !== memberId);

  await group.save();
  await group.populate("members admins creator", "username email profileImage");

  console.log(` Removed member ${memberId} from group ${groupId}`);
  return group;
};

// LEAVE GROUP SERVICE
export const processLeaveGroup = async (groupId, userId) => {
  const group = await Group.findById(groupId);

  // IF CREATOR LEAVES, TRANSFER OWNERSHIP OR DELETE GROUP
  if (group.creator.toString() === userId) {
    if (group.members.length === 1) {
      // Last member leaving, delete group
      await Group.findByIdAndDelete(groupId);
      console.log(` Deleted empty group ${groupId}`);
      return { message: "Group deleted", deleted: true };
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
  return { message: "Left group successfully" };
};

// MAKE ADMIN SERVICE
export const processMakeAdmin = async (groupId, memberId) => {
  const group = await Group.findById(groupId);

  //  Check if already admin (safety check)
  const isAlreadyAdmin = group.admins.some((a) => a.toString() === memberId);

  if (!isAlreadyAdmin) {
    group.admins.push(memberId);
  }

  await group.save();
  await group.populate("members admins creator", "username email profileImage");

  console.log(` Made ${memberId} admin in group ${groupId}`);
  return group;
};

// REMOVE ADMIN SERVICE
export const processRemoveAdmin = async (groupId, memberId) => {
  const group = await Group.findById(groupId);

  // Remove from admins array (demote to regular member)
  group.admins = group.admins.filter((a) => a.toString() !== memberId);

  await group.save();
  await group.populate("members admins creator", "username email profileImage");

  console.log(`Removed ${memberId} from admin in group ${groupId}`);
  return group;
};

// DELETE GROUP SERVICE
export const processDeleteGroup = async (groupId) => {
  const group = await Group.findById(groupId);

  // Delete group image if exists
  if (group.groupImage) {
    deleteOldGroupImage(group.groupImage);
  }

  await Group.findByIdAndDelete(groupId);

  // Delete all group messages
  await Message.deleteMany({ groupId });

  console.log(` Deleted group ${groupId}`);
  return { message: "Group deleted successfully" };
};

// PIN GROUP SERVICE
export const processPinGroup = async (groupId, userId) => {
  const group = await Group.findById(groupId);

  group.pinnedBy.push({ userId, pinnedAt: new Date() });
  await group.save();

  console.log(` Group pinned: ${groupId} by ${userId}`);
  return { message: "Group pinned successfully", group };
};

// UNPIN GROUP SERVICE
export const processUnpinGroup = async (groupId, userId) => {
  const group = await Group.findById(groupId);

  group.pinnedBy = group.pinnedBy.filter((p) => p.userId.toString() !== userId);
  await group.save();

  console.log(` Group unpinned: ${groupId} by ${userId}`);
  return { message: "Group unpinned successfully", group };
};

// ARCHIVE GROUP SERVICE
export const processArchiveGroup = async (groupId, userId) => {
  const group = await Group.findById(groupId);

  group.archivedBy.push({ userId, archivedAt: new Date() });
  await group.save();

  console.log(` Group archived: ${groupId} by ${userId}`);
  return { message: "Group archived successfully", group };
};

// UNARCHIVE GROUP SERVICE
export const processUnarchiveGroup = async (groupId, userId) => {
  const group = await Group.findById(groupId);

  group.archivedBy = group.archivedBy.filter(
    (a) => a.userId.toString() !== userId,
  );
  await group.save();

  console.log(` Group unarchived: ${groupId} by ${userId}`);
  return { message: "Group unarchived successfully", group };
};

// CLEAR GROUP CHAT SERVICE
export const processClearGroupChat = async (groupId, userId) => {
  //  Mark messages as deleted for current user ONLY
  const result = await Message.updateMany(
    {
      groupId,
      isGroupMessage: true,
      deletedFor: { $ne: userId },
    },
    {
      $addToSet: { deletedFor: userId },
    },
  );

  await Group.findByIdAndUpdate(groupId, {
    lastMessage: "",
    lastMessageTime: Date.now(),
    lastMessageSender: null,
  });

  console.log(
    ` Marked ${result.modifiedCount} messages as deleted for user ${userId} in group ${groupId}`,
  );

  return {
    message: "Group chat cleared for you",
    deletedCount: result.modifiedCount,
    groupId,
    userId,
  };
};

// CHECK USER PIN COUNT SERVICE
export const checkUserPinCount = async (userId) => {
  const userPinnedCount = await Group.countDocuments({
    "pinnedBy.userId": userId,
  });

  return userPinnedCount;
};

// FIND GROUP IMAGE FILE SERVICE
export const findGroupImageFile = (filename) => {
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
    throw new Error("Image not found");
  }

  return filePath;
};

// GET MIME TYPE SERVICE
export const getMimeType = (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".jfif": "image/jpeg",
  };

  return mimeTypes[ext] || "image/jpeg";
};

// FETCH GROUP BY ID SERVICE
export const fetchGroupById = async (groupId) => {
  const group = await Group.findById(groupId);
  return group;
};
