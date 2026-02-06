
import * as friendService from "../services/friend.service.js";
import * as friendValidation from "../validations/friend.validation.js";

// SEND FRIEND REQUEST CONTROLLER
export const sendFriendRequest = async (req, res) => {
  try {
    const senderId = req.user.id;
    const { receiverId } = req.body;

    // Validation
    const validation = friendValidation.validateSendFriendRequest(senderId, receiverId);
    if (!validation.isValid) {
      return res.status(400).json({ message: validation.message });
    }

    // Service call
    const result = await friendService.processSendFriendRequest(senderId, receiverId);

    res.json(result);
  } catch (err) {
    console.error("Send friend request error:", err);
    
    if (err.message === "Cannot send request") {
      return res.status(403).json({ message: err.message });
    }
    
    if (err.message === "Already friends") {
      return res.status(400).json({ message: err.message });
    }
    
    if (err.message === "Request already sent") {
      return res.status(400).json({ message: err.message });
    }
    
    res.status(500).json({ message: "Failed to send request", error: err.message });
  }
};

//  ACCEPT FRIEND REQUEST CONTROLLER
export const acceptFriendRequest = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { requestId } = req.params;

    // Fetch friend request
    const friendRequest = await friendService.fetchFriendRequestById(requestId);

    // Validation
    const validation = friendValidation.validateAcceptRequest(friendRequest, currentUserId);
    if (!validation.isValid) {
      return res.status(validation.statusCode).json({ message: validation.message });
    }

    // Service call
    const result = await friendService.processAcceptFriendRequest(friendRequest);

    res.json(result);
  } catch (err) {
    console.error("Accept request error:", err);
    res.status(500).json({ message: "Failed to accept request", error: err.message });
  }
};

//  REJECT FRIEND REQUEST CONTROLLER
export const rejectFriendRequest = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { requestId } = req.params;

    // Fetch friend request
    const friendRequest = await friendService.fetchFriendRequestById(requestId);

    // Validation
    const validation = friendValidation.validateRejectRequest(friendRequest, currentUserId);
    if (!validation.isValid) {
      return res.status(validation.statusCode).json({ message: validation.message });
    }

    // Service call
    const result = await friendService.processRejectFriendRequest(requestId);

    res.json(result);
  } catch (err) {
    console.error("Reject request error:", err);
    res.status(500).json({ message: "Failed to reject request", error: err.message });
  }
};

//  GET PENDING FRIEND REQUESTS (RECEIVED) CONTROLLER
export const getPendingRequests = async (req, res) => {
  try {
    const currentUserId = req.user.id;

    // Service call
    const requests = await friendService.fetchPendingRequests(currentUserId);

    res.json(requests);
  } catch (err) {
    console.error("Get pending requests error:", err);
    res.status(500).json({ message: "Failed to fetch requests", error: err.message });
  }
};

//  GET SENT FRIEND REQUESTS CONTROLLER
export const getSentRequests = async (req, res) => {
  try {
    const currentUserId = req.user.id;

    // Service call
    const requests = await friendService.fetchSentRequests(currentUserId);

    res.json(requests);
  } catch (err) {
    console.error("Get sent requests error:", err);
    res.status(500).json({ message: "Failed to fetch requests", error: err.message });
  }
};

//  UNFRIEND CONTROLLER
export const unfriend = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { friendId } = req.params;

    // Service call
    const result = await friendService.processUnfriend(currentUserId, friendId);

    res.json(result);
  } catch (err) {
    console.error("Unfriend error:", err);
    
    if (err.message === "Friendship not found") {
      return res.status(404).json({ message: err.message });
    }
    
    res.status(500).json({ message: "Failed to unfriend", error: err.message });
  }
};

//  BLOCK USER CONTROLLER
export const blockUser = async (req, res) => {
  try {
    const blockerId = req.user.id;
    const { userId } = req.body;

    // Validation
    const validation = friendValidation.validateBlockUser(blockerId, userId);
    if (!validation.isValid) {
      return res.status(400).json({ message: validation.message });
    }

    // Service call
    const result = await friendService.processBlockUser(blockerId, userId);

    res.json(result);
  } catch (err) {
    console.error("Block user error:", err);
    
    if (err.message === "User already blocked") {
      return res.status(400).json({ message: err.message });
    }
    
    res.status(500).json({ message: "Failed to block user", error: err.message });
  }
};

// UNBLOCK USER CONTROLLER
export const unblockUser = async (req, res) => {
  try {
    const blockerId = req.user.id;
    const { userId } = req.params;

    // Service call
    const result = await friendService.processUnblockUser(blockerId, userId);

    res.json(result);
  } catch (err) {
    console.error("Unblock user error:", err);
    
    if (err.message === "User not blocked") {
      return res.status(404).json({ message: err.message });
    }
    
    res.status(500).json({ message: "Failed to unblock user", error: err.message });
  }
};

//  GET BLOCKED USERS CONTROLLER
export const getBlockedUsers = async (req, res) => {
  try {
    const currentUserId = req.user.id;

    // Service call
    const blockedUsers = await friendService.fetchBlockedUsers(currentUserId);

    res.json(blockedUsers);
  } catch (err) {
    console.error("Get blocked users error:", err);
    res.status(500).json({ message: "Failed to fetch blocked users", error: err.message });
  }
};

//  CHECK RELATIONSHIP STATUS CONTROLLER
export const getRelationshipStatus = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { userId } = req.params;

    // Service call
    const status = await friendService.fetchRelationshipStatus(currentUserId, userId);

    res.json(status);
  } catch (err) {
    console.error("Get relationship status error:", err);
    res.status(500).json({ message: "Failed to get status", error: err.message });
  }
};

//  GET ALL FRIENDS CONTROLLER
export const getFriends = async (req, res) => {
  try {
    const currentUserId = req.user.id;

    // Service call
    const friends = await friendService.fetchAllFriends(currentUserId);

    res.json(friends);
  } catch (err) {
    console.error(" Get friends error:", err);
    res.status(500).json({ 
      message: "Failed to fetch friends", 
      error: err.message 
    });
  }
};