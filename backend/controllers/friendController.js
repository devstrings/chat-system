import FriendRequest from "../models/FriendRequest.js";
import Friendship from "../models/Friendship.js";
import BlockedUser from "../models/BlockedUser.js";
import mongoose from "mongoose";

//  HELPER FUNCTION: Format user with full image URL
const formatUserWithFullImageUrl = (user) => {
  const userObj = user.toObject ? user.toObject() : user;
  return {
    ...userObj,
    profileImage: userObj.profileImage 
      ? `http://localhost:5000${userObj.profileImage}` 
      : null
  };
};

// SEND FRIEND REQUEST
export const sendFriendRequest = async (req, res) => {
  try {
    const senderId = req.user.id;
    const { receiverId } = req.body;

    if (!receiverId) {
      return res.status(400).json({ message: "Receiver ID required" });
    }

    if (senderId === receiverId) {
      return res.status(400).json({ message: "Cannot send request to yourself" });
    }

    // Check if blocked
    const isBlocked = await BlockedUser.findOne({
      $or: [
        { blocker: senderId, blocked: receiverId },
        { blocker: receiverId, blocked: senderId }
      ]
    });

    if (isBlocked) {
      return res.status(403).json({ message: "Cannot send request" });
    }

    // Check if already friends
    const alreadyFriends = await Friendship.findOne({
      $or: [
        { user1: senderId, user2: receiverId },
        { user1: receiverId, user2: senderId }
      ]
    });

    if (alreadyFriends) {
      return res.status(400).json({ message: "Already friends" });
    }

    // Check if request already exists
    const existingRequest = await FriendRequest.findOne({
      $or: [
        { sender: senderId, receiver: receiverId },
        { sender: receiverId, receiver: senderId }
      ]
    });

    if (existingRequest) {
      return res.status(400).json({ message: "Request already exists" });
    }

    // Create new request
    const friendRequest = await FriendRequest.create({
      sender: senderId,
      receiver: receiverId,
      status: "pending"
    });

    res.json({ 
      message: "Friend request sent", 
      friendRequest 
    });
  } catch (err) {
    console.error("Send friend request error:", err);
    res.status(500).json({ message: "Failed to send request", error: err.message });
  }
};

//  ACCEPT FRIEND REQUEST
export const acceptFriendRequest = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { requestId } = req.params;

    const friendRequest = await FriendRequest.findById(requestId);

    if (!friendRequest) {
      return res.status(404).json({ message: "Request not found" });
    }

    if (friendRequest.receiver.toString() !== currentUserId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    if (friendRequest.status !== "pending") {
      return res.status(400).json({ message: "Request already processed" });
    }

    // Update request status
    friendRequest.status = "accepted";
    await friendRequest.save();

    // Create friendship
    await Friendship.create({
      user1: friendRequest.sender,
      user2: friendRequest.receiver
    });

    res.json({ message: "Friend request accepted" });
  } catch (err) {
    console.error("Accept request error:", err);
    res.status(500).json({ message: "Failed to accept request", error: err.message });
  }
};

//  REJECT FRIEND REQUEST
export const rejectFriendRequest = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { requestId } = req.params;

    const friendRequest = await FriendRequest.findById(requestId);

    if (!friendRequest) {
      return res.status(404).json({ message: "Request not found" });
    }

    if (friendRequest.receiver.toString() !== currentUserId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // Delete request
    await FriendRequest.findByIdAndDelete(requestId);

    res.json({ message: "Friend request rejected" });
  } catch (err) {
    console.error("Reject request error:", err);
    res.status(500).json({ message: "Failed to reject request", error: err.message });
  }
};

//  GET PENDING FRIEND REQUESTS (RECEIVED) - WITH PROFILE IMAGES
export const getPendingRequests = async (req, res) => {
  try {
    const currentUserId = req.user.id;

    const requests = await FriendRequest.find({
      receiver: currentUserId,
      status: "pending"
    })
      .populate("sender", "username email profileImage")
      .sort({ createdAt: -1 });

    //  Format sender with full image URL
    const formattedRequests = requests.map(request => ({
      ...request.toObject(),
      sender: formatUserWithFullImageUrl(request.sender)
    }));

    res.json(formattedRequests);
  } catch (err) {
    console.error("Get pending requests error:", err);
    res.status(500).json({ message: "Failed to fetch requests", error: err.message });
  }
};

//  GET SENT FRIEND REQUESTS - WITH PROFILE IMAGES
export const getSentRequests = async (req, res) => {
  try {
    const currentUserId = req.user.id;

    const requests = await FriendRequest.find({
      sender: currentUserId,
      status: "pending"
    })
      .populate("receiver", "username email profileImage")
      .sort({ createdAt: -1 });

    //  Format receiver with full image URL
    const formattedRequests = requests.map(request => ({
      ...request.toObject(),
      receiver: formatUserWithFullImageUrl(request.receiver)
    }));

    res.json(formattedRequests);
  } catch (err) {
    console.error("Get sent requests error:", err);
    res.status(500).json({ message: "Failed to fetch requests", error: err.message });
  }
};

//  UNFRIEND
export const unfriend = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { friendId } = req.params;

    const friendship = await Friendship.findOneAndDelete({
      $or: [
        { user1: currentUserId, user2: friendId },
        { user1: friendId, user2: currentUserId }
      ]
    });

    if (!friendship) {
      return res.status(404).json({ message: "Friendship not found" });
    }

    res.json({ message: "Unfriended successfully" });
  } catch (err) {
    console.error("Unfriend error:", err);
    res.status(500).json({ message: "Failed to unfriend", error: err.message });
  }
};

//  BLOCK USER
export const blockUser = async (req, res) => {
  try {
    const blockerId = req.user.id;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "User ID required" });
    }

    if (blockerId === userId) {
      return res.status(400).json({ message: "Cannot block yourself" });
    }

    // Check if already blocked
    const existingBlock = await BlockedUser.findOne({
      blocker: blockerId,
      blocked: userId
    });

    if (existingBlock) {
      return res.status(400).json({ message: "User already blocked" });
    }

    // Remove friendship if exists
    await Friendship.findOneAndDelete({
      $or: [
        { user1: blockerId, user2: userId },
        { user1: userId, user2: blockerId }
      ]
    });

    // Remove pending friend requests
    await FriendRequest.deleteMany({
      $or: [
        { sender: blockerId, receiver: userId },
        { sender: userId, receiver: blockerId }
      ]
    });

    // Create block
    await BlockedUser.create({
      blocker: blockerId,
      blocked: userId
    });

    res.json({ message: "User blocked successfully" });
  } catch (err) {
    console.error("Block user error:", err);
    res.status(500).json({ message: "Failed to block user", error: err.message });
  }
};

// UNBLOCK USER
export const unblockUser = async (req, res) => {
  try {
    const blockerId = req.user.id;
    const { userId } = req.params;

    const block = await BlockedUser.findOneAndDelete({
      blocker: blockerId,
      blocked: userId
    });

    if (!block) {
      return res.status(404).json({ message: "User not blocked" });
    }

    res.json({ message: "User unblocked successfully" });
  } catch (err) {
    console.error("Unblock user error:", err);
    res.status(500).json({ message: "Failed to unblock user", error: err.message });
  }
};

//  GET BLOCKED USERS - WITH PROFILE IMAGES
export const getBlockedUsers = async (req, res) => {
  try {
    const currentUserId = req.user.id;

    const blocked = await BlockedUser.find({ blocker: currentUserId })
      .populate("blocked", "username email profileImage")
      .sort({ createdAt: -1 });

    //  Format blocked user with full image URL
    const formattedBlocked = blocked.map(block => ({
      ...block.toObject(),
      blocked: formatUserWithFullImageUrl(block.blocked)
    }));

    res.json(formattedBlocked);
  } catch (err) {
    console.error("Get blocked users error:", err);
    res.status(500).json({ message: "Failed to fetch blocked users", error: err.message });
  }
};

//  CHECK RELATIONSHIP STATUS
export const getRelationshipStatus = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { userId } = req.params;

    // Check if friends
    const friendship = await Friendship.findOne({
      $or: [
        { user1: currentUserId, user2: userId },
        { user1: userId, user2: currentUserId }
      ]
    });

    if (friendship) {
      return res.json({ status: "friends" });
    }

    // Check if blocked
    const isBlocked = await BlockedUser.findOne({
      blocker: currentUserId,
      blocked: userId
    });

    if (isBlocked) {
      return res.json({ status: "blocked" });
    }

    const isBlockedBy = await BlockedUser.findOne({
      blocker: userId,
      blocked: currentUserId
    });

    if (isBlockedBy) {
      return res.json({ status: "blocked_by" });
    }

    // Check friend request
    const sentRequest = await FriendRequest.findOne({
      sender: currentUserId,
      receiver: userId,
      status: "pending"
    });

    if (sentRequest) {
      return res.json({ status: "request_sent", requestId: sentRequest._id });
    }

    const receivedRequest = await FriendRequest.findOne({
      sender: userId,
      receiver: currentUserId,
      status: "pending"
    });

    if (receivedRequest) {
      return res.json({ status: "request_received", requestId: receivedRequest._id });
    }

    res.json({ status: "none" });
  } catch (err) {
    console.error("Get relationship status error:", err);
    res.status(500).json({ message: "Failed to get status", error: err.message });
  }
};

//  GET ALL FRIENDS - WITH PROFILE IMAGES
export const getFriends = async (req, res) => {
  try {
    const currentUserId = req.user.id;

    console.log(" Fetching friends for user:", currentUserId);

    // Find all friendships where current user is involved
    const friendships = await Friendship.find({
      $or: [
        { user1: currentUserId },
        { user2: currentUserId }
      ]
    });

    console.log(` Found ${friendships.length} friendships`);

    // Extract friend user IDs
    const friendIds = friendships.map(friendship => {
      return friendship.user1.toString() === currentUserId 
        ? friendship.user2 
        : friendship.user1;
    });

    // Get user details for all friends
    const User = mongoose.model("User");
    const friends = await User.find({ 
      _id: { $in: friendIds } 
    }).select("username email profileImage");

    //  Format all friends with full image URLs
    const formattedFriends = friends.map(friend => formatUserWithFullImageUrl(friend));

    console.log(` Returning ${formattedFriends.length} friends`);

    res.json(formattedFriends);
  } catch (err) {
    console.error(" Get friends error:", err);
    res.status(500).json({ 
      message: "Failed to fetch friends", 
      error: err.message 
    });
  }
};