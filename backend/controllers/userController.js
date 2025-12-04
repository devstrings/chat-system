import User from "../models/userModel.js";

// Get all users except current user
export const getUsers = async (req, res) => {
  try {
    const currentUserId = req.user.id;

    const users = await User.find({ _id: { $ne: currentUserId } })
      .select("username email _id")  
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
    const searchQuery = req.query.q || req.query.query; // Support both parameters
    const currentUserId = req.user.id;

    if (!searchQuery || searchQuery.trim().length === 0) {
      return res.json([]); // Return empty array instead of error
    }

    const users = await User.find({
      _id: { $ne: currentUserId },
      username: { $regex: searchQuery, $options: "i" }
    })
      .select("username email _id")
      .limit(20); // Limit results to 20 users

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

    const user = await User.findById(id).select("username email _id");  
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (err) {
    console.error("Get user by ID error:", err);
    res.status(500).json({ message: "Failed to fetch user", error: err.message });
  }
};