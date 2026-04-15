// actions/sidebar.actions.js
import axiosInstance from "@/lib/axiosInstance";
import API_BASE_URL from "@/config/api";

// Search users
export const searchUsers = async (searchQuery) => {
  const response = await axiosInstance.get(
    `${API_BASE_URL}/api/users/search?q=${encodeURIComponent(searchQuery)}`
  );
  return response.data;
};

//  Send friend request
export const sendFriendRequest = async (userId) => {
  const response = await axiosInstance.post(`${API_BASE_URL}/api/friends/request/send`, {
    receiverId: userId,
  });
  return response.data;
};



//  Format last message text (pure logic, API nahi)
export const formatLastMessageText = (message) => {
  if (!message) return "";
  if (message.text === "" && !message.attachments?.length) return "";
  
  // Call record
  if (message.isCallRecord) {
    const icon = message.callType === "video" ? "📹" : "📞";
    if (message.callStatus === "missed") return `${icon} Missed Call`;
    if (message.callStatus === "rejected") return `${icon} Call Declined`;
    if (message.callStatus === "cancelled") return `${icon} Cancelled`;
    if (message.callDuration > 0) {
      const mins = Math.floor(message.callDuration / 60);
      const secs = message.callDuration % 60;
      return `${icon} ${mins > 0 ? mins + "m " : ""}${secs}s`;
    }
    return `${icon} Call`;
  }

  if (message.attachments && message.attachments.length > 0) {
    const attachment = message.attachments[0];

    if (attachment.isVoiceMessage) {
      const duration = attachment.duration || 0;
      if (duration > 0) {
        const mins = Math.floor(duration / 60);
        const secs = Math.floor(duration % 60);
        return `🎤 Voice (${mins}:${secs.toString().padStart(2, "0")})`;
      }
      return "🎤 Voice message";
    }

    const fileType = attachment.fileType || attachment.type || "";

    if (fileType.startsWith("image/")) return "📷 Photo";
    if (fileType.startsWith("video/")) return "🎥 Video";
    if (fileType === "application/pdf") return "📕 PDF";
    if (fileType.startsWith("audio/")) return "🎵 Audio";
    if (fileType.includes("word")) return "📄 Document";
    if (fileType === "text/plain") return "📝 Text file";

    return "📎 File";
  }

  return message.text || message.content || "";
};

//  Format time
export const formatTime = (date) => {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};