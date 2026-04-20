// actions/dashboard.actions.js
import axiosInstance from "@/lib/axiosInstance";
import API_BASE_URL from "@/config/api";
import apiActions from "@/store/apiActions";
import { decryptMessageHelper } from "@/utils/cryptoUtils";

//  Load all statuses
export const loadAllStatuses = async () => {
  const response = await axiosInstance.get(`${API_BASE_URL}/api/status`);
  return response.data;
};

//  Load pinned conversations
export const loadPinnedConversations = async () => {
  const response = await axiosInstance.get(`${API_BASE_URL}/api/messages/pinned`);
  return response.data.map((conv) => conv._id);
};

//  Load archived conversations
export const loadArchivedConversations = async () => {
  const response = await axiosInstance.get(`${API_BASE_URL}/api/messages/archived`);
  return response.data.map((conv) => conv._id);
};

//  Archive a conversation/group
export const archiveConversation = async (conversationId, isGroup) => {
  const endpoint = isGroup
    ? `${API_BASE_URL}/api/groups/${conversationId}/archive`
    : `${API_BASE_URL}/api/messages/conversation/${conversationId}/archive`;
  
  await axiosInstance.post(endpoint, {});
};

// : Unarchive a conversation/group
export const unarchiveConversation = async (conversationId, isGroup) => {
  const endpoint = isGroup
    ? `${API_BASE_URL}/api/groups/${conversationId}/unarchive`
    : `${API_BASE_URL}/api/messages/conversation/${conversationId}/unarchive`;
  
  await axiosInstance.delete(endpoint, {});
};

//  Pin a conversation/group
export const pinConversation = async (conversationId, isGroup) => {
  const endpoint = isGroup
    ? `${API_BASE_URL}/api/groups/${conversationId}/pin`
    : `${API_BASE_URL}/api/messages/conversation/${conversationId}/pin`;
  
  await axiosInstance.post(endpoint, {});
};

//  Unpin a conversation/group
export const unpinConversation = async (conversationId, isGroup) => {
  const endpoint = isGroup
    ? `${API_BASE_URL}/api/groups/${conversationId}/unpin`
    : `${API_BASE_URL}/api/messages/conversation/${conversationId}/unpin`;
  
  await axiosInstance.delete(endpoint, {});
};

// : Clear chat messages
export const clearChatMessages = async (conversationId) => {
  await axiosInstance.patch(
    `${API_BASE_URL}/api/messages/conversation/${conversationId}/clear`,
    {}
  );
};

//  Remove profile picture
export const removeProfilePicture = async () => {
  await axiosInstance.delete(`${API_BASE_URL}/api/users/profile/remove-image`);
};

//  Load last messages for a user
export const loadUserLastMessages = async (userId, currentUserId) => {
  try {
    const convRes = await apiActions.getConversation(userId, true);
    if (!convRes || convRes?.deletedBy?.some((d) => d.userId === currentUserId)) {
      return null;
    }
    
    const conversationId = convRes?._id;
    if (!conversationId) return null;
    
    const messagesRaw = await apiActions.getPaginatedConversationMessagesById(
      conversationId,
      1,
      20
    );

    const messages = await Promise.all(messagesRaw.map(async msg => {
        msg.text = await decryptMessageHelper(msg, currentUserId);
        return msg;
    }));
    
    const visibleMessages = messages.filter(
      (msg) => !msg.deletedFor?.includes(currentUserId)
    );
    
    return {
      conversationId,
      messages: visibleMessages,
      unreadCount: messages.filter(
        (msg) => msg.sender._id !== currentUserId && msg.status !== "read"
      ).length,
    };
  } catch (err) {
    if (err.response?.status === 404) return null;
    throw err;
  }
};

// Load last messages for a group
export const loadGroupLastMessages = async (groupId, currentUserId) => {
  const response = await axiosInstance.get(
    `${API_BASE_URL}/api/messages/group/${groupId}`
  );
  
  const messagesRaw = response.data;
  const messages = await Promise.all(messagesRaw.map(async msg => {
      msg.text = await decryptMessageHelper(msg, currentUserId);
      return msg;
  }));
  const visibleMessages = messages.filter(
    (msg) => !msg.deletedFor?.includes(currentUserId)
  );
  
  return {
    conversationId: groupId,
    messages: visibleMessages,
  };
};

//  Format attachment text (pure logic)
export const formatAttachmentText = (attachments) => {
  if (!attachments || attachments.length === 0) return "";

  const file = attachments[0];

  if (file.isVoiceMessage) {
    const duration = file.duration || 0;
    if (duration > 0) {
      const mins = Math.floor(duration / 60);
      const secs = Math.floor(duration % 60);
      return `🎤 Voice (${mins}:${secs.toString().padStart(2, "0")})`;
    }
    return "🎤 Voice message";
  }

  const fileType = file.fileType || file.type || "";

  if (fileType.startsWith("image/")) return "📷 Photo";
  if (fileType.startsWith("video/")) return "🎥 Video";
  if (fileType === "application/pdf") return "📕 PDF";
  if (fileType.startsWith("audio/")) return "🎵 Audio";
  if (fileType.includes("word")) return "📄 Document";
  if (fileType === "text/plain") return "📝 Text file";

  return "📎 File";
};

//  Play notification sound
export const playNotificationSound = () => {
  const audio = new Audio("/sounds/notification.mp3");
  audio.volume = 0.5;
  audio.play().catch(() => {});
};

//  Check if browser notification is needed
export const shouldShowBrowserNotification = () => {
  return Notification.permission === "granted" && document.hidden;
};

// Request notification permission
export const requestNotificationPermission = async () => {
  if ("Notification" in window && Notification.permission === "default") {
    await Notification.requestPermission();
  }
};

// Register service worker
export const registerServiceWorker = () => {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js");
  }
};

// Process call record message
export const processCallRecordMessage = (callMessage) => {
  const icon = callMessage.callType === "video" ? "📹" : "📞";
  let text = "";
  
  if (callMessage.callStatus === "missed") {
    text = `${icon} Missed Call`;
  } else if (callMessage.callStatus === "rejected") {
    text = `${icon} Call Declined`;
  } else if (callMessage.callStatus === "cancelled") {
    text = `${icon} Cancelled`;
  } else if (callMessage.callDuration > 0) {
    text = `${icon} ${callMessage.callDuration}s`;
  } else {
    text = `${icon} Call`;
  }
  
  return { ...callMessage, text };
};