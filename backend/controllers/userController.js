import User from "../models/user.js";
import BlockedUser from "../models/BlockedUser.js";
import fs from "fs";
import path from "path";


// USER CONTROLLERS 

// Get all users except current user
export const getUsers = async (req, res) => {
  try {
    const currentUserId = req.user.id;

    const blockedRelationships = await BlockedUser.find({
      $or: [
        { blocker: currentUserId },
        { blocked: currentUserId }
      ]
    });

    const blockedUserIds = blockedRelationships.map(block =>
      block.blocker.toString() === currentUserId
        ? block.blocked.toString()
        : block.blocker.toString()
    );

    const users = await User.find({
      _id: { $ne: currentUserId, $nin: blockedUserIds }
    })
      .select("username email _id profileImage")
      .sort({ username: 1 });

    res.json(users);
  } catch (err) {
    console.error("Get users error:", err);
    res.status(500).json({ message: "Failed to fetch users", error: err.message });
  }
};

// Search users by username or email
export const searchUsers = async (req, res) => {
  try {
    const searchQuery = req.query.q || req.query.query;
    const currentUserId = req.user.id;

    if (!searchQuery || searchQuery.trim().length === 0) return res.json([]);

    const blockedRelationships = await BlockedUser.find({
      $or: [
        { blocker: currentUserId },
        { blocked: currentUserId }
      ]
    });

    const blockedUserIds = blockedRelationships.map(block =>
      block.blocker.toString() === currentUserId
        ? block.blocked.toString()
        : block.blocker.toString()
    );

    const users = await User.find({
      _id: { $ne: currentUserId, $nin: blockedUserIds },
      $or: [
        { username: { $regex: searchQuery, $options: "i" } },
        { email: { $regex: searchQuery, $options: "i" } }
      ]
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
        { blocker: id, blocked: currentUserId }
      ]
    });

    if (isBlocked) return res.status(403).json({ message: "User not accessible" });

    const user = await User.findById(id).select("username email _id profileImage");

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json(user);
  } catch (err) {
    console.error("Get user by ID error:", err);
    res.status(500).json({ message: "Failed to fetch user", error: err.message });
  }
};

// Get current user profile
export const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("username email profileImage");
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    res.json(user);
  } catch (err) {
    console.error("Get current user error:", err);
    res.status(500).json({ message: "Failed to get profile", error: err.message });
  }
};

// PROFILE IMAGE 

// Serve profile image with authentication
export const serveProfileImage = async (req, res) => {
  try {
    const filename = req.params.filename;
    const filepath = path.join(process.cwd(), 'uploads', 'profileImages', filename);
    
    console.log(' Serving image:', filename);
    console.log(' File path:', filepath);
    
    if (!fs.existsSync(filepath)) {
      console.log(' File not found:', filepath);
      return res.status(404).json({ message: "Image not found" });
    }
    
    console.log(' File found, sending...');
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

    console.log(' Image uploaded:', imageUrl);

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

    if (!profileImage) return res.status(400).json({ message: "Profile image URL is required" });

    console.log(' Saving profile image:', profileImage);

    const user = await User.findByIdAndUpdate(
      userId,
      { profileImage },
      { new: true }
    ).select("username email _id profileImage");

    if (!user) return res.status(404).json({ message: "User not found" });

    console.log(' User profileImage saved:', user.profileImage);

    res.json({ 
      message: "Profile image updated successfully", 
      user: {
        ...user.toObject(),
        profileImage: user.profileImage
      }
    });
  } catch (err) {
    console.error(" Update profile image error:", err);
    res.status(500).json({ message: "Failed to update profile image", error: err.message });
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
        profileImage: null
      }
    });
  } catch (err) {
    console.error(" Remove profile image error:", err);
    res.status(500).json({ message: "Failed to remove profile image" });
  }
};