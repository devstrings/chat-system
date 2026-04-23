import { friendService } from "#services";
import asyncHandler from "express-async-handler";
// SEND FRIEND REQUEST CONTROLLER
export const sendFriendRequest = asyncHandler(async (req, res) => {
  const senderId = req.user.id;
  const { receiverId } = req.body;
  const result = await friendService.processSendFriendRequest(senderId, receiverId);
  const io = req.app.get("webSocket");
  if (io) {
    if (result?.autoAccepted) {
      const acceptedPayload = {
        userId: senderId,
        otherUserId: receiverId,
        message: result.message,
      };
      io.to(senderId.toString()).emit("friendRequestAccepted", acceptedPayload);
      io.to(receiverId.toString()).emit("friendRequestAccepted", {
        userId: receiverId,
        otherUserId: senderId,
        message: result.message,
      });
    } else {
      io.to(receiverId.toString()).emit("friendRequestReceived", {
        senderId: req.user.id,
        senderName: req.user.username,
      });
    }
  }

  res.json(result);
});

// ACCEPT FRIEND REQUEST CONTROLLER
export const acceptFriendRequest = asyncHandler(async (req, res) => {
  const friendRequest = req.validatedFriendRequest;
  const result = await friendService.processAcceptFriendRequest(friendRequest);
  const io = req.app.get("webSocket");
  if (io) {
    const senderId = friendRequest.sender?.toString();
    const receiverId = friendRequest.receiver?.toString();
    const payload = {
      senderId,
      receiverId,
      requestId: friendRequest._id?.toString(),
      message: result.message,
    };
    io.to(senderId).emit("friendRequestAccepted", payload);
    io.to(receiverId).emit("friendRequestAccepted", payload);
  }
  res.json(result);
});

// REJECT FRIEND REQUEST CONTROLLER
export const rejectFriendRequest = asyncHandler(async (req, res) => {
  const { requestId } = req.params;
  const result = await friendService.processRejectFriendRequest(requestId);
  res.json(result);
});

// GET PENDING FRIEND REQUESTS (RECEIVED) CONTROLLER
export const getPendingRequests = asyncHandler(async (req, res) => {
  const currentUserId = req.user.id;
  const requests = await friendService.fetchPendingRequests(currentUserId);
  res.json(requests);
});
// GET SENT FRIEND REQUESTS CONTROLLER
export const getSentRequests = asyncHandler(async (req, res) => {
  const currentUserId = req.user.id;
  const requests = await friendService.fetchSentRequests(currentUserId);
  res.json(requests);
});

// UNFRIEND CONTROLLER
export const unfriend = asyncHandler(async (req, res) => {
  const currentUserId = req.user.id;
  const { friendId } = req.params;
  const result = await friendService.processUnfriend(currentUserId, friendId);
  res.json(result);
});

// BLOCK USER CONTROLLER
export const blockUser = asyncHandler(async (req, res) => {
  const blockerId = req.user.id;
  const { userId } = req.body;
  const result = await friendService.processBlockUser(blockerId, userId);
  res.json(result);
});

// UNBLOCK USER CONTROLLER
export const unblockUser = asyncHandler(async (req, res) => {
  const blockerId = req.user.id;
  const { userId } = req.params;
  const result = await friendService.processUnblockUser(blockerId, userId);
  res.json(result);
});
// GET BLOCKED USERS CONTROLLER
export const getBlockedUsers = asyncHandler(async (req, res) => {
  const currentUserId = req.user.id;
  const blockedUsers = await friendService.fetchBlockedUsers(currentUserId);
  res.json(blockedUsers);
});

// CHECK RELATIONSHIP STATUS CONTROLLER
export const getRelationshipStatus = asyncHandler(async (req, res) => {
  const currentUserId = req.user.id;
  const { userId } = req.params;
  const status = await friendService.fetchRelationshipStatus(currentUserId, userId);
  res.json(status);
});

// GET ALL FRIENDS CONTROLLER
export const getFriends = asyncHandler(async (req, res) => {
  const currentUserId = req.user.id;
  const friends = await friendService.fetchAllFriends(currentUserId);
  res.json(friends);
});