import User from "../models/userModel.js";

// Get all users except current user
export const getUsers = async (req, res) => {
  try {
    const currentUserId = req.user.id; // from verifyToken middleware

    const users = await User.find({ _id: { $ne: currentUserId } })
      .select("-password") 
      .sort({ username: 1 });

    res.json(users);
  } catch (err) {
    console.error("Get users error:", err);
    res.status(500).json({ message: "Failed to fetch users", error: err.message });
  }
};

// Search users by username
export const searchUsers = async (req, res) => {
  try {
    const { query } = req.query;
    const currentUserId = req.user.id;

    if (!query) {
      return res.status(400).json({ message: "Search query is required" });
    }

    const users = await User.find({
      _id: { $ne: currentUserId },
      username: { $regex: query, $options: "i" }
    }).select("-password");

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

    const user = await User.findById(id).select("-password");
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (err) {
    console.error("Get user by ID error:", err);
    res.status(500).json({ message: "Failed to fetch user", error: err.message });
  }
};