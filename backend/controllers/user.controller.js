import { userService } from "#services";
import path from "path";
import fs from "fs";
import asyncHandler from "express-async-handler";

// GET ALL USERS CONTROLLER
export const getUsers = asyncHandler(async (req, res) => {
  const currentUserId = req.user.id;
  const blockedRelationships = await userService.fetchBlockedRelationships(currentUserId);
  const blockedUserIds = userService.getBlockedUserIds(blockedRelationships, currentUserId);
  const users = await userService.fetchAllUsersExceptBlocked(currentUserId, blockedUserIds);
  res.json(users);
});

// SEARCH USERS CONTROLLER
export const searchUsers = asyncHandler(async (req, res) => {
  const searchQuery = req.query.q || req.query.query;
  const currentUserId = req.user.id;
  const blockedRelationships = await userService.fetchBlockedRelationships(currentUserId);
  const blockedUserIds = userService.getBlockedUserIds(blockedRelationships, currentUserId);
  const users = await userService.searchUsersExceptBlocked(searchQuery, currentUserId, blockedUserIds);
  res.json(users);
});

// GET USER BY ID CONTROLLER
export const getUserById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await userService.fetchUserById(id);
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json(user);
});

// GET CURRENT USER CONTROLLER
export const getCurrentUser = asyncHandler(async (req, res) => {
  const user = await userService.fetchCurrentUser(req.user.id);
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json(user);
});

// SERVE PROFILE IMAGE CONTROLLER
export const serveProfileImage = asyncHandler(async (req, res) => {
  const filename = req.params.filename;
  const filepath = path.join(process.cwd(), "uploads", "profileImages", filename);
  if (!fs.existsSync(filepath)) {
    return res.status(404).json({ message: "Image not found" });
  }
  res.sendFile(filepath);
});

// UPLOAD PROFILE IMAGE CONTROLLER
export const uploadProfileImage = asyncHandler(async (req, res) => {
  const imageUrl = `/uploads/profileImages/${req.file.filename}`;
  res.json({ message: "Image uploaded successfully", imageUrl });
});

// UPDATE PROFILE IMAGE CONTROLLER
export const updateProfileImage = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { profileImage } = req.body;
  const user = await userService.processUpdateProfileImage(userId, profileImage);
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json({
    message: "Profile image updated successfully",
    user: { ...user.toObject(), profileImage: user.profileImage },
  });
});

// REMOVE PROFILE IMAGE CONTROLLER
export const removeProfileImage = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const result = await userService.processRemoveProfileImage(userId);
  if (!result) return res.status(404).json({ message: "User not found" });
  res.json({ message: "Profile image removed successfully", user: result });
});
// UPLOAD COVER PHOTO CONTROLLER
export const uploadCoverPhoto = asyncHandler(async (req, res) => {
  const result = await userService.processUploadCoverPhoto(req.user.id, req.file.filename);
  if (!result.user) return res.status(404).json({ message: "User not found" });
  res.json({
    message: "Cover photo uploaded successfully",
    coverPhotoUrl: result.coverPhotoUrl,
    user: result.user,
  });
});

// REMOVE COVER PHOTO CONTROLLER
export const removeCoverPhoto = asyncHandler(async (req, res) => {
  const result = await userService.processRemoveCoverPhoto(req.user.id);
  if (!result) return res.status(404).json({ message: "User not found" });
  res.json({ message: "Cover photo removed successfully", user: result });
});
