// userController.js - Only request/response handling

import * as userService from "../services/user.service.js";
import * as userValidation from "../validations/user.validation.js";
import path from "path";
import fs from "fs";
// GET ALL USERS CONTROLLER
export const getUsers = async (req, res) => {
  try {
    const currentUserId = req.user.id;

    // Service calls
    const blockedRelationships = await userService.fetchBlockedRelationships(currentUserId);
    const blockedUserIds = userService.getBlockedUserIds(blockedRelationships, currentUserId);
    const users = await userService.fetchAllUsersExceptBlocked(currentUserId, blockedUserIds);

    res.json(users);
  } catch (err) {
    console.error(" Get users error:", err);
    res.status(500).json({ 
      message: "Failed to fetch users", 
      error: err.message 
    });
  }
};

// SEARCH USERS CONTROLLER
export const searchUsers = async (req, res) => {
  try {
    const searchQuery = req.query.q || req.query.query;
    const currentUserId = req.user.id;

    // Validation
    const queryValidation = userValidation.validateSearchQuery(searchQuery);
    if (!queryValidation.isValid) {
      return res.json([]);
    }

    // Service calls
    const blockedRelationships = await userService.fetchBlockedRelationships(currentUserId);
    const blockedUserIds = userService.getBlockedUserIds(blockedRelationships, currentUserId);
    const users = await userService.searchUsersExceptBlocked(searchQuery, currentUserId, blockedUserIds);

    res.json(users);
  } catch (err) {
    console.error(" Search users error:", err);
    res.status(500).json({ 
      message: "Search failed", 
      error: err.message 
    });
  }
};

// GET USER BY ID CONTROLLER
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user.id;

    // Check if blocked
    const isBlocked = await userService.checkIfUserIsBlocked(currentUserId, id);

    // Validation
    const blockValidation = userValidation.validateUserIsBlocked(isBlocked);
    if (!blockValidation.isValid) {
      return res.status(blockValidation.statusCode).json({ 
        message: blockValidation.message 
      });
    }

    // Service call
    const user = await userService.fetchUserById(id);

    // Validation
    const userValidationResult = userValidation.validateUserExists(user);
    if (!userValidationResult.isValid) {
      return res.status(userValidationResult.statusCode).json({ 
        message: userValidationResult.message 
      });
    }

    res.json(user);
  } catch (err) {
    console.error(" Get user by ID error:", err);
    res.status(500).json({ 
      message: "Failed to fetch user", 
      error: err.message 
    });
  }
};

// GET CURRENT USER CONTROLLER
export const getCurrentUser = async (req, res) => {
  try {
    // Service call
    const user = await userService.fetchCurrentUser(req.user.id);

    // Validation
    const userValidationResult = userValidation.validateUserExists(user);
    if (!userValidationResult.isValid) {
      return res.status(userValidationResult.statusCode).json({ 
        message: userValidationResult.message 
      });
    }

    console.log(" Current user loaded:", {
      username: user.username,
      profileImage: user.profileImage,
      coverPhoto: user.coverPhoto,
    });

    res.json(user);
  } catch (err) {
    console.error(" Get current user error:", err);
    res.status(500).json({ 
      message: "Failed to get profile", 
      error: err.message 
    });
  }
};

// SERVE PROFILE IMAGE CONTROLLER
export const serveProfileImage = async (req, res) => {
  try {
    const filename = req.params.filename;
    const filepath = path.join(
      process.cwd(),
      "uploads",
      "profileImages",
      filename,
    );

    console.log(" Serving image:", filename);
    console.log(" File path:", filepath);

    // Direct file check (no validation function)
    if (!fs.existsSync(filepath)) {
      console.log(" File not found:", filepath);
      return res.status(404).json({ message: "Image not found" });
    }

    console.log(" File found, sending...");
    res.sendFile(filepath);
  } catch (err) {
    console.error(" Image serve error:", err);
    res.status(500).json({ message: "Error loading image" });
  }
};

// UPLOAD PROFILE IMAGE CONTROLLER
export const uploadProfileImage = async (req, res) => {
  try {
    // Validation
    const fileValidation = userValidation.validateFileUploaded(req.file);
    if (!fileValidation.isValid) {
      return res.status(fileValidation.statusCode).json({ 
        message: fileValidation.message 
      });
    }

    const imageUrl = `/uploads/profileImages/${req.file.filename}`;

    console.log(" Image uploaded:", imageUrl);

    res.json({
      message: "Image uploaded successfully",
      imageUrl,
    });
  } catch (err) {
    console.error(" Upload profile image error:", err);
    res.status(500).json({ 
      message: "Upload failed", 
      error: err.message 
    });
  }
};

// UPDATE PROFILE IMAGE CONTROLLER
export const updateProfileImage = async (req, res) => {
  try {
    const userId = req.user.id;
    const { profileImage } = req.body;

    // Validation
    const imageUrlValidation = userValidation.validateProfileImageUrl(profileImage);
    if (!imageUrlValidation.isValid) {
      return res.status(imageUrlValidation.statusCode).json({ 
        message: imageUrlValidation.message 
      });
    }

    console.log(" Saving profile image:", profileImage);

    // Service call
    const user = await userService.processUpdateProfileImage(userId, profileImage);

    // Validation
    const userValidationResult = userValidation.validateUserExists(user);
    if (!userValidationResult.isValid) {
      return res.status(userValidationResult.statusCode).json({ 
        message: userValidationResult.message 
      });
    }

    console.log(" User profileImage saved:", user.profileImage);

    res.json({
      message: "Profile image updated successfully",
      user: {
        ...user.toObject(),
        profileImage: user.profileImage,
      },
    });
  } catch (err) {
    console.error(" Update profile image error:", err);
    res.status(500).json({ 
      message: "Failed to update profile image", 
      error: err.message 
    });
  }
};

// REMOVE PROFILE IMAGE CONTROLLER
export const removeProfileImage = async (req, res) => {
  try {
    const userId = req.user.id;

    // Service call
    const result = await userService.processRemoveProfileImage(userId);

    // Validation
    const userValidationResult = userValidation.validateUserExists(result);
    if (!userValidationResult.isValid) {
      return res.status(userValidationResult.statusCode).json({ 
        message: userValidationResult.message 
      });
    }

    res.json({
      message: "Profile image removed successfully",
      user: result,
    });
  } catch (err) {
    console.error(" Remove profile image error:", err);
    res.status(500).json({ message: "Failed to remove profile image" });
  }
};

// UPLOAD COVER PHOTO CONTROLLER
export const uploadCoverPhoto = async (req, res) => {
  try {
    // Validation
    const fileValidation = userValidation.validateFileUploaded(req.file);
    if (!fileValidation.isValid) {
      return res.status(fileValidation.statusCode).json({ 
        message: fileValidation.message 
      });
    }

    // Service call
    const result = await userService.processUploadCoverPhoto(
      req.user.id, 
      req.file.filename
    );

    // Validation
    const userValidationResult = userValidation.validateUserExists(result.user);
    if (!userValidationResult.isValid) {
      return res.status(userValidationResult.statusCode).json({ 
        message: userValidationResult.message 
      });
    }

    console.log(" Cover photo saved:", result.coverPhotoUrl);

    res.json({
      message: "Cover photo uploaded successfully",
      coverPhotoUrl: result.coverPhotoUrl,
      user: result.user,
    });
  } catch (err) {
    console.error(" Upload cover photo error:", err);
    res.status(500).json({
      message: "Failed to upload cover photo",
      error: err.message,
    });
  }
};

// REMOVE COVER PHOTO CONTROLLER
export const removeCoverPhoto = async (req, res) => {
  try {
    console.log(" Remove cover photo request");
    console.log(" User ID:", req.user.id);

    // Service call
    const result = await userService.processRemoveCoverPhoto(req.user.id);

    // Validation
    const userValidationResult = userValidation.validateUserExists(result);
    if (!userValidationResult.isValid) {
      console.error(" User not found");
      return res.status(userValidationResult.statusCode).json({ 
        message: userValidationResult.message 
      });
    }

    res.json({
      message: "Cover photo removed successfully",
      user: result,
    });
  } catch (err) {
    console.error(" Remove cover photo error:", err);
    console.error("Error details:", err.message);
    console.error("Error stack:", err.stack);

    res.status(500).json({
      message: "Failed to remove cover photo",
      error: err.message,
    });
  }
};