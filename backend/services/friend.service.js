import FriendRequest from "#models/FriendRequest";
import Friendship from "#models/Friendship";
import BlockedUser from "#models/BlockedUser";
import mongoose from "mongoose";
import config from "#config/index";
import AppError from "../shared/AppError.js";
//  HELPER FUNCTION TO FORMAT USER WITH FULL IMAGE URL
const formatUserWithFullImageUrl = (user) => {
  const userObj = user.toObject ? user.toObject() : user;

  const isExternalUrl =
    userObj.profileImage &&
    (userObj.profileImage.startsWith("http://") ||
      userObj.profileImage.startsWith("https://"));

  return {
    ...userObj,
    profileImage: userObj.profileImage
      ? isExternalUrl
        ? userObj.profileImage
        : `${config.serverUrl}${userObj.profileImage}`
      : null,
  };
};

// CHECK IF BLOCKED SERVICE
export const checkIfBlocked = async (senderId, receiverId) => {
  const isBlocked = await BlockedUser.findOne({
    $or: [
      { blocker: senderId, blocked: receiverId },
      { blocker: receiverId, blocked: senderId },
    ],
  });

  return isBlocked;
};

// CHECK IF ALREADY FRIENDS SERVICE
export const checkIfAlreadyFriends = async (senderId, receiverId) => {
  const alreadyFriends = await Friendship.findOne({
    $or: [
      { user1: senderId, user2: receiverId },
      { user1: receiverId, user2: senderId },
    ],
  });

  return alreadyFriends;
};

// CHECK OPPOSITE REQUEST SERVICE
export const checkOppositeRequest = async (senderId, receiverId) => {
  const oppositeRequest = await FriendRequest.findOne({
    sender: receiverId,
    receiver: senderId,
    status: "pending",
  });

  return oppositeRequest;
};

//  CHECK EXISTING REQUEST SERVICE (Only pending requests)
export const checkExistingRequest = async (senderId, receiverId) => {
  // Check if ANY PENDING request exists between these users (either direction)
  const existingRequest = await FriendRequest.findOne({
    $or: [
      { sender: senderId, receiver: receiverId },
      { sender: receiverId, receiver: senderId },
    ],
    status: "pending",
  });

  return existingRequest;
};

// AUTO ACCEPT AND CREATE FRIENDSHIP SERVICE
export const autoAcceptAndCreateFriendship = async (
  oppositeRequest,
  senderId,
  receiverId,
) => {

  //  Create friendship
  await Friendship.create({
    user1: senderId,
    user2: receiverId,
  });

  //  DELETE the opposite request after accepting (cleanup)
  await FriendRequest.findByIdAndDelete(oppositeRequest._id);


  return {
    message: "You are now friends!",
    autoAccepted: true,
  };
};

//  SEND FRIEND REQUEST SERVICE
export const processSendFriendRequest = async (senderId, receiverId) => {

  // Check if blocked
  const isBlocked = await checkIfBlocked(senderId, receiverId);
  if (isBlocked) {
throw new AppError("Cannot send request", 403);  }

  // Check if already friends
  const alreadyFriends = await checkIfAlreadyFriends(senderId, receiverId);
  if (alreadyFriends) {
throw new AppError("Already friends", 400);  }

  //  Check for ONLY PENDING requests (ignore accepted/rejected ones)
  const existingPendingRequest = await FriendRequest.findOne({
    $or: [
      { sender: senderId, receiver: receiverId },
      { sender: receiverId, receiver: senderId },
    ],
    status: "pending",
  });

  if (existingPendingRequest) {
    const isSameDirection =
      existingPendingRequest.sender.toString() === senderId &&
      existingPendingRequest.receiver.toString() === receiverId;

    const isOppositeDirection =
      existingPendingRequest.sender.toString() === receiverId &&
      existingPendingRequest.receiver.toString() === senderId;

    if (isSameDirection) {
      console.log(
        " Request already exists (same direction):",
        existingPendingRequest._id,
      );
throw new AppError("Request already sent", 400);    }

    if (isOppositeDirection) {
      return await autoAcceptAndCreateFriendship(
        existingPendingRequest,
        senderId,
        receiverId,
      );
    }
  }

  //  Clean up any old non-pending requests before creating new one
  await FriendRequest.deleteMany({
    $or: [
      { sender: senderId, receiver: receiverId },
      { sender: receiverId, receiver: senderId },
    ],
    status: { $ne: "pending" }, // Delete accepted/rejected requests
  });

  // Create new request
  const friendRequest = await FriendRequest.create({
    sender: senderId,
    receiver: receiverId,
    status: "pending",
  });


  return {
    message: "Friend request sent",
    friendRequest,
  };
};

//  ACCEPT FRIEND REQUEST SERVICE (Delete request after accepting)
export const processAcceptFriendRequest = async (friendRequest) => {
  // Create friendship
  await Friendship.create({
    user1: friendRequest.sender,
    user2: friendRequest.receiver,
  });

  //  DELETE the request (don't just update status)
  await FriendRequest.findByIdAndDelete(friendRequest._id);


  return { message: "Friend request accepted" };
};

// REJECT FRIEND REQUEST SERVICE
export const processRejectFriendRequest = async (requestId) => {
  // Delete request
  await FriendRequest.findByIdAndDelete(requestId);

  return { message: "Friend request rejected" };
};

// GET PENDING REQUESTS SERVICE
export const fetchPendingRequests = async (currentUserId) => {
  const requests = await FriendRequest.find({
    receiver: currentUserId,
    status: "pending",
  })
    .populate("sender", "username email profileImage")
    .sort({ createdAt: -1 });

  //  Format sender with full image URL
  const formattedRequests = requests.map((request) => ({
    ...request.toObject(),
    sender: formatUserWithFullImageUrl(request.sender),
  }));

  return formattedRequests;
};

// GET SENT REQUESTS SERVICE
export const fetchSentRequests = async (currentUserId) => {
  const requests = await FriendRequest.find({
    sender: currentUserId,
    status: "pending",
  })
    .populate("receiver", "username email profileImage")
    .sort({ createdAt: -1 });

  //  Format receiver with full image URL
  const formattedRequests = requests.map((request) => ({
    ...request.toObject(),
    receiver: formatUserWithFullImageUrl(request.receiver),
  }));

  return formattedRequests;
};

//  UNFRIEND SERVICE
export const processUnfriend = async (currentUserId, friendId) => {

  // Delete friendship
  const friendship = await Friendship.findOneAndDelete({
    $or: [
      { user1: currentUserId, user2: friendId },
      { user1: friendId, user2: currentUserId },
    ],
  });

  if (!friendship) {
throw new AppError("Friendship not found", 404);  }


  //  DELETE ALL friend requests (ALL statuses) - Complete cleanup
  const deletedRequests = await FriendRequest.deleteMany({
    $or: [
      { sender: currentUserId, receiver: friendId },
      { sender: friendId, receiver: currentUserId },
    ],
  });


  return { message: "Unfriended successfully" };
};

// BLOCK USER SERVICE
export const processBlockUser = async (blockerId, userId) => {
  // Check if already blocked
  const existingBlock = await BlockedUser.findOne({
    blocker: blockerId,
    blocked: userId,
  });

  if (existingBlock) {
throw new AppError("User already blocked", 400);  }

  // Remove friendship if exists
  await Friendship.findOneAndDelete({
    $or: [
      { user1: blockerId, user2: userId },
      { user1: userId, user2: blockerId },
    ],
  });

  // Remove pending friend requests
  await FriendRequest.deleteMany({
    $or: [
      { sender: blockerId, receiver: userId },
      { sender: userId, receiver: blockerId },
    ],
  });

  // Create block
  await BlockedUser.create({
    blocker: blockerId,
    blocked: userId,
  });

  return { message: "User blocked successfully" };
};

// UNBLOCK USER SERVICE
export const processUnblockUser = async (blockerId, userId) => {
  const block = await BlockedUser.findOneAndDelete({
    blocker: blockerId,
    blocked: userId,
  });

  if (!block) {
throw new AppError("User not blocked", 404);  }

  return { message: "User unblocked successfully" };
};

// GET BLOCKED USERS SERVICE
export const fetchBlockedUsers = async (currentUserId) => {
  const blocked = await BlockedUser.find({ blocker: currentUserId })
    .populate("blocked", "username email profileImage")
    .sort({ createdAt: -1 });

  //  Format blocked user with full image URL
  const formattedBlocked = blocked.map((block) => ({
    ...block.toObject(),
    blocked: formatUserWithFullImageUrl(block.blocked),
  }));

  return formattedBlocked;
};

// GET RELATIONSHIP STATUS SERVICE
export const fetchRelationshipStatus = async (currentUserId, userId) => {
  // Check if friends
  const friendship = await Friendship.findOne({
    $or: [
      { user1: currentUserId, user2: userId },
      { user1: userId, user2: currentUserId },
    ],
  });

  if (friendship) {
    return { status: "friends" };
  }

  // Check if blocked
  const isBlocked = await BlockedUser.findOne({
    blocker: currentUserId,
    blocked: userId,
  });

  if (isBlocked) {
    return { status: "blocked" };
  }

  const isBlockedBy = await BlockedUser.findOne({
    blocker: userId,
    blocked: currentUserId,
  });

  if (isBlockedBy) {
    return { status: "blocked_by" };
  }

  // Check friend request
  const sentRequest = await FriendRequest.findOne({
    sender: currentUserId,
    receiver: userId,
    status: "pending",
  });

  if (sentRequest) {
    return { status: "request_sent", requestId: sentRequest._id };
  }

  const receivedRequest = await FriendRequest.findOne({
    sender: userId,
    receiver: currentUserId,
    status: "pending",
  });

  if (receivedRequest) {
    return { status: "request_received", requestId: receivedRequest._id };
  }

  return { status: "none" };
};

// GET ALL FRIENDS SERVICE
export const fetchAllFriends = async (currentUserId) => {

  // Find all friendships where current user is involved
  const friendships = await Friendship.find({
    $or: [{ user1: currentUserId }, { user2: currentUserId }],
  });


  // Extract friend user IDs
  const friendIds = friendships.map((friendship) => {
    return friendship.user1.toString() === currentUserId
      ? friendship.user2
      : friendship.user1;
  });

  // Get user details for all friends
  const User = mongoose.model("User");
 const friends = await User.find({
    _id: { $in: friendIds },
  }).select("username email profileImage isEmailVerified createdAt");

  //  Format all friends with full image URLs
  const formattedFriends = friends.map((friend) =>
    formatUserWithFullImageUrl(friend),
  );


  return formattedFriends;
};

// FETCH FRIEND REQUEST BY ID SERVICE
export const fetchFriendRequestById = async (requestId) => {
  const friendRequest = await FriendRequest.findById(requestId);
  return friendRequest;
};
