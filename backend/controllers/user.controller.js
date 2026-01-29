import User from "../models/user.js";
import BlockedUser from "../models/BlockedUser.js";
import fs from "fs";
import path from "path";

// Get all users except current user
export const getUsers = async (req, res) => {
  try {
    const currentUserId = req.user.id;

    const blockedRelationships = await BlockedUser.find({
      $or: [{ blocker: currentUserId }, { blocked: currentUserId }],
    });

    const blockedUserIds = blockedRelationships.map((block) =>
      block.blocker.toString() === currentUserId
        ? block.blocked.toString()
        : block.blocker.toString(),
    );

    const users = await User.find({
      _id: { $ne: currentUserId, $nin: blockedUserIds },
    })
      .select("username email _id profileImage")
      .sort({ username: 1 });

    res.json(users);
  } catch (err) {
    console.error("Get users error:", err);
    res
      .status(500)
      .json({ message: "Failed to fetch users", error: err.message });
  }
};

// Search users by username or email
export const searchUsers = async (req, res) => {
  try {
    const searchQuery = req.query.q || req.query.query;
    const currentUserId = req.user.id;

    if (!searchQuery || searchQuery.trim().length === 0) return res.json([]);

    const blockedRelationships = await BlockedUser.find({
      $or: [{ blocker: currentUserId }, { blocked: currentUserId }],
    });

    const blockedUserIds = blockedRelationships.map((block) =>
      block.blocker.toString() === currentUserId
        ? block.blocked.toString()
        : block.blocker.toString(),
    );

    const users = await User.find({
      _id: { $ne: currentUserId, $nin: blockedUserIds },
      $or: [
        { username: { $regex: searchQuery, $options: "i" } },
        { email: { $regex: searchQuery, $options: "i" } },
      ],
    })
      .select("username email _id profileImage")
      .limit(20);

    res.json(users);
  } catch (err) {
    console.error("Search users error:", err);
    res.status(500).json({ message: "Search failed", error: err.message });
  }
};

// Get single user by ID
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user.id;

    const isBlocked = await BlockedUser.findOne({
      $or: [
        { blocker: currentUserId, blocked: id },
        { blocker: id, blocked: currentUserId },
      ],
    });

    if (isBlocked)
      return res.status(403).json({ message: "User not accessible" });

    const user = await User.findById(id).select(
      "username email _id profileImage",
    );

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json(user);
  } catch (err) {
    console.error("Get user by ID error:", err);
    res
      .status(500)
      .json({ message: "Failed to fetch user", error: err.message });
  }
};

// Get current user profile
export const getCurrentUser = async (req, res) => {
  try {
    // Add coverPhoto to select
    const user = await User.findById(req.user.id).select(
      "username email profileImage coverPhoto",
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    console.log(" Current user loaded:", {
      username: user.username,
      profileImage: user.profileImage,
      coverPhoto: user.coverPhoto,
    });

    res.json(user);
  } catch (err) {
    console.error(" Get current user error:", err);
    res
      .status(500)
      .json({ message: "Failed to get profile", error: err.message });
  }
};

// Serve profile image with authentication
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

// Upload Profile Image (returns URL)
export const uploadProfileImage = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const imageUrl = `/uploads/profileImages/${req.file.filename}`;

    console.log(" Image uploaded:", imageUrl);

    res.json({
      message: "Image uploaded successfully",
      imageUrl,
    });
  } catch (err) {
    console.error(" Upload profile image error:", err);
    res.status(500).json({ message: "Upload failed", error: err.message });
  }
};

// Update profile image in DB
export const updateProfileImage = async (req, res) => {
  try {
    const userId = req.user.id;
    const { profileImage } = req.body;

    if (!profileImage)
      return res.status(400).json({ message: "Profile image URL is required" });

    console.log(" Saving profile image:", profileImage);

    const user = await User.findByIdAndUpdate(
      userId,
      { profileImage },
      { new: true },
    ).select("username email _id profileImage");

    if (!user) return res.status(404).json({ message: "User not found" });

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
    res
      .status(500)
      .json({ message: "Failed to update profile image", error: err.message });
  }
};

// Remove profile image
export const removeProfileImage = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.profileImage) {
      const imagePath = path.join(process.cwd(), user.profileImage);

      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
        console.log(" Profile image deleted from server");
      }
    }

    user.profileImage = null;
    await user.save();

    res.json({
      message: "Profile image removed successfully",
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        profileImage: null,
      },
    });
  } catch (err) {
    console.error(" Remove profile image error:", err);
    res.status(500).json({ message: "Failed to remove profile image" });
  }
};
//  Upload Cover Photo
export const uploadCoverPhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    //  Correct URL format
    const coverPhotoUrl = `/uploads/profileImages/${req.file.filename}`;

    //  Use req.user.id (not req.userId)
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { coverPhoto: coverPhotoUrl },
      { new: true },
    ).select("username email profileImage coverPhoto");

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    console.log(" Cover photo saved:", coverPhotoUrl);

    res.json({
      message: "Cover photo uploaded successfully",
      coverPhotoUrl,
      user: updatedUser,
    });
  } catch (err) {
    console.error(" Upload cover photo error:", err);
    res.status(500).json({
      message: "Failed to upload cover photo",
      error: err.message,
    });
  }
};

//  Remove Cover Photo
export const removeCoverPhoto = async (req, res) => {
  try {
    console.log(" Remove cover photo request");
    console.log("User ID:", req.user.id);

    //  Check if user exists
    const user = await User.findById(req.user.id);

    if (!user) {
      console.error(" User not found");
      return res.status(404).json({ message: "User not found" });
    }

    console.log(" User found:", user.username);
    console.log("Current cover photo:", user.coverPhoto);

    //  Delete file if exists
    if (user.coverPhoto) {
      const filename = user.coverPhoto.split("/").pop();
      const filepath = path.join(
        process.cwd(),
        "uploads",
        "profileImages",
        filename,
      );

      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
      } else {
        console.log(" File not found on server (might be already deleted)");
      }
    } else {
      console.log(" No cover photo to delete");
    }

    //  Update database
    user.coverPhoto = null;
    await user.save();

    console.log(" Cover photo removed from database");

    res.json({
      message: "Cover photo removed successfully",
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        profileImage: user.profileImage,
        coverPhoto: null,
      },
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
