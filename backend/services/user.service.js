import User from "../models/User.js";
import BlockedUser from "../models/BlockedUser.js";
import fs from "fs";
import path from "path";

// FETCH BLOCKED RELATIONSHIPS SERVICE
export const fetchBlockedRelationships = async (userId) => {
  const blockedRelationships = await BlockedUser.find({
    $or: [{ blocker: userId }, { blocked: userId }],
  });

  return blockedRelationships;
};

// GET BLOCKED USER IDS SERVICE
export const getBlockedUserIds = (blockedRelationships, currentUserId) => {
  const blockedUserIds = blockedRelationships.map((block) =>
    block.blocker.toString() === currentUserId
      ? block.blocked.toString()
      : block.blocker.toString(),
  );

  return blockedUserIds;
};

// FETCH ALL USERS EXCEPT BLOCKED SERVICE
export const fetchAllUsersExceptBlocked = async (
  currentUserId,
  blockedUserIds,
) => {
  const users = await User.find({
    _id: { $ne: currentUserId, $nin: blockedUserIds },
  })
    .select("username email _id profileImage")
    .sort({ username: 1 });

  return users;
};

// SEARCH USERS SERVICE
export const searchUsersExceptBlocked = async (
  searchQuery,
  currentUserId,
  blockedUserIds,
) => {
  const users = await User.find({
    _id: { $ne: currentUserId, $nin: blockedUserIds },
    $or: [
      { username: { $regex: searchQuery, $options: "i" } },
      { email: { $regex: searchQuery, $options: "i" } },
    ],
  })
    .select("username email _id profileImage")
    .limit(20);

  return users;
};

// CHECK IF USER IS BLOCKED SERVICE
export const checkIfUserIsBlocked = async (currentUserId, targetUserId) => {
  const isBlocked = await BlockedUser.findOne({
    $or: [
      { blocker: currentUserId, blocked: targetUserId },
      { blocker: targetUserId, blocked: currentUserId },
    ],
  });

  return isBlocked;
};

// FETCH USER BY ID SERVICE
export const fetchUserById = async (userId) => {
  const user = await User.findById(userId).select(
    "username email _id profileImage",
  );

  return user;
};

// FETCH CURRENT USER SERVICE
export const fetchCurrentUser = async (userId) => {
  const user = await User.findById(userId).select(
    "username email profileImage coverPhoto",
  );

  return user;
};

// CHECK IF FILE EXISTS SERVICE
export const checkFileExists = (filepath) => {
  return fs.existsSync(filepath);
};

// DELETE FILE SERVICE
export const deleteFile = (filepath) => {
  if (fs.existsSync(filepath)) {
    fs.unlinkSync(filepath);
    console.log(" File deleted from server:", filepath);
    return true;
  }
  return false;
};

// UPDATE USER PROFILE IMAGE SERVICE
export const processUpdateProfileImage = async (userId, profileImageUrl) => {
  const user = await User.findByIdAndUpdate(
    userId,
    { profileImage: profileImageUrl },
    { new: true },
  ).select("username email _id profileImage");

  return user;
};

// REMOVE USER PROFILE IMAGE SERVICE
export const processRemoveProfileImage = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    return null;
  }

  // Delete file if exists
  if (user.profileImage) {
    const imagePath = path.join(process.cwd(), user.profileImage);
    deleteFile(imagePath);
  }

  // Update database
  user.profileImage = null;
  await user.save();

  return {
    _id: user._id,
    username: user.username,
    email: user.email,
    profileImage: null,
  };
};

// UPLOAD COVER PHOTO SERVICE
export const processUploadCoverPhoto = async (userId, filename) => {
  const coverPhotoUrl = `/uploads/profileImages/${filename}`;

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { coverPhoto: coverPhotoUrl },
    { new: true },
  ).select("username email profileImage coverPhoto");

  return {
    user: updatedUser,
    coverPhotoUrl,
  };
};

// REMOVE COVER PHOTO SERVICE
export const processRemoveCoverPhoto = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    return null;
  }

  console.log(" User found:", user.username);
  console.log("Current cover photo:", user.coverPhoto);

  // Delete file if exists
  if (user.coverPhoto) {
    const filename = user.coverPhoto.split("/").pop();
    const filepath = path.join(
      process.cwd(),
      "uploads",
      "profileImages",
      filename,
    );

    const fileDeleted = deleteFile(filepath);
    if (!fileDeleted) {
      console.log(" File not found on server (might be already deleted)");
    }
  } else {
    console.log(" No cover photo to delete");
  }

  // Update database
  user.coverPhoto = null;
  await user.save();

  console.log("Cover photo removed from database");

  return {
    _id: user._id,
    username: user.username,
    email: user.email,
    profileImage: user.profileImage,
    coverPhoto: null,
  };
};
