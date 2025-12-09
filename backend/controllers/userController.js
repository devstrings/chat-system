import User from "../models/userModel.js";
import BlockedUser from "../models/BlockedUser.js";

// Get all users except current user
export const getUsers = async (req, res) => {
  try {
    const currentUserId = req.user.id;

    //  Get all blocked relationships
    const blockedRelationships = await BlockedUser.find({
      $or: [
        { blocker: currentUserId }, // Users I blocked
        { blocked: currentUserId }  // Users who blocked me
      ]
    });

    // Extract blocked user IDs
    const blockedUserIds = blockedRelationships.map(block => 
      block.blocker.toString() === currentUserId 
        ? block.blocked.toString()  // Users I blocked
        : block.blocker.toString()  // Users who blocked me
    );

    console.log(`User ${currentUserId} has ${blockedUserIds.length} blocked relationships`);

    //  Exclude current user AND all blocked users
    const users = await User.find({ 
      _id: { 
        $ne: currentUserId,
        $nin: blockedUserIds  // Exclude blocked users
      } 
    })
      .select("username email _id")  
      .sort({ username: 1 });

    res.json(users);
  } catch (err) {
    console.error(" Get users error:", err);
    res.status(500).json({ message: "Failed to fetch users", error: err.message });
  }
};

//  Search users by username (exclude blocked)
export const searchUsers = async (req, res) => {
  try {
    const searchQuery = req.query.q || req.query.query;
    const currentUserId = req.user.id;

    if (!searchQuery || searchQuery.trim().length === 0) {
      return res.json([]);
    }

    //  Get all blocked relationships
    const blockedRelationships = await BlockedUser.find({
      $or: [
        { blocker: currentUserId }, // Users I blocked
        { blocked: currentUserId }  // Users who blocked me
      ]
    });

    // Extract blocked user IDs
    const blockedUserIds = blockedRelationships.map(block => 
      block.blocker.toString() === currentUserId 
        ? block.blocked.toString()  // Users I blocked
        : block.blocker.toString()  // Users who blocked me
    );

    console.log(` Searching for: "${searchQuery}"`);
    console.log(`Excluding ${blockedUserIds.length} blocked users`);

    //  Search with blocked users excluded (username OR email)
    const users = await User.find({
      _id: { 
        $ne: currentUserId,
        $nin: blockedUserIds  // Exclude blocked users
      },
      $or: [
        { username: { $regex: searchQuery, $options: "i" } },  // Search by username
        { email: { $regex: searchQuery, $options: "i" } }      // Search by email
      ]
    })
      .select("username email _id")
      .limit(20);

    console.log(`Found ${users.length} users`);

    res.json(users);
  } catch (err) {
    console.error(" Search users error:", err);
    res.status(500).json({ message: "Search failed", error: err.message });
  }
};

// Get single user by ID
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user.id;

    // Check if user is blocked
    const isBlocked = await BlockedUser.findOne({
      $or: [
        { blocker: currentUserId, blocked: id },  // I blocked them
        { blocker: id, blocked: currentUserId }   // They blocked me
      ]
    });

    if (isBlocked) {
      console.log(` User ${id} is blocked`);
      return res.status(403).json({ message: "User not accessible" });
    }

    const user = await User.findById(id).select("username email _id");  
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (err) {
    console.error(" Get user by ID error:", err);
    res.status(500).json({ message: "Failed to fetch user", error: err.message });
  }
};