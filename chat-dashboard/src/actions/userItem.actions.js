// actions/userItem.actions.js
import axiosInstance from "@/lib/axiosInstance";
import API_BASE_URL from "@/config/api";
import { default as apiActions } from "@/store/apiActions";

// Get friend status
export const getFriendStatus = async (userId) => {
  const resData = await apiActions.getFriendStatus(userId);
  return {
    status: resData.status,
    requestId: resData.requestId,
  };
};

//  Send friend request
export const sendFriendRequest = async (userId) => {
  await apiActions.sendFriendRequest(userId);
};

//  Accept friend request
export const acceptFriendRequest = async (requestId) => {
  await axiosInstance.post(`/api/friends/request/${requestId}/accept`);
};

// Reject friend request
export const rejectFriendRequest = async (requestId) => {
  await axiosInstance.delete(`/api/friends/request/${requestId}/reject`);
};

// Unfriend user
export const unfriendUser = async (userId) => {
  await axiosInstance.delete(`/api/friends/unfriend/${userId}`);
};

//  Block user
export const blockUser = async (userId) => {
  await axiosInstance.post(`/api/friends/block`, { userId });
};

// Unblock user
export const unblockUser = async (userId) => {
  await apiActions.unblockFriend(userId);
};

// Clear chat messages
export const clearChat = async (conversationId) => {
  await axiosInstance.patch(
    `${API_BASE_URL}/api/messages/conversation/${conversationId}/clear`,
    {}
  );
};

//Delete conversation
export const deleteConversation = async (conversationId, otherUserId) => {
  const response = await axiosInstance.delete(
    `${API_BASE_URL}/api/messages/conversation/${conversationId}/delete`,
    {
      data: { otherUserId },
    }
  );
  return response.data;
};

// Get or create conversation
export const getOrCreateConversation = async (otherUserId) => {
  const response = await axiosInstance.post(
    `${API_BASE_URL}/api/messages/conversation`,
    { otherUserId }
  );
  return response.data;
};

// Format time (pure logic)
export const formatTime = (date) => {
  if (!date) return "";
  const now = new Date();
  const msgDate = new Date(date);
  const diff = now - msgDate;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d`;
  return msgDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

//  Truncate message (pure logic)
export const truncateMessage = (msg, length = 30) => {
  if (!msg || msg.trim() === "") return "";
  if (msg.length <= length) return msg;
  return msg.substring(0, length) + "...";
};

