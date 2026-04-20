// actions/messageInput.actions.js
import axiosInstance from "@/lib/axiosInstance";
import API_BASE_URL from "@/config/api";

//  File upload
export const uploadFile = async (file, conversationId, isGroup) => {
  const formData = new FormData();
  formData.append("file", file);
  
  const uploadConversationId = isGroup ? conversationId : conversationId;
  if (!uploadConversationId) {
    throw new Error("Please select a chat first");
  }
  
  formData.append("conversationId", uploadConversationId);
  
  const token = localStorage.getItem("accessToken");
  
  const response = await axiosInstance.post(
    `${API_BASE_URL}/api/file/upload`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
        Authorization: `Bearer ${token}`,
      },
    }
  );
  
  return response.data;
};

//  Voice message upload
export const uploadVoiceMessage = async (audioBlob, duration, conversationId, isGroup) => {
  const formData = new FormData();
  const audioFile = new File([audioBlob], `voice_${Date.now()}.webm`, {
    type: "audio/webm",
  });
  
  formData.append("file", audioFile);
  
  const uploadConversationId = isGroup ? conversationId : conversationId;
  formData.append("conversationId", uploadConversationId);
  formData.append("isVoiceMessage", "true");
  formData.append("duration", duration.toString());
  
  const token = localStorage.getItem("accessToken");
  
  const response = await axiosInstance.post(
    `${API_BASE_URL}/api/file/upload`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
        Authorization: `Bearer ${token}`,
      },
    }
  );
  
  return { ...response.data, duration };
};

//  Send message via API (individual)
export const sendIndividualMessage = async (socket, conversationId, text, attachments, replyTo, encryptionData = null) => {
  try {
    const response = await axiosInstance.post(
      `${API_BASE_URL}/api/messages/send`,
      {
        conversationId,
        text: text.trim(),
        attachments,
        encryptionData,
        replyTo: replyTo ? {
          _id: replyTo._id,
          text: replyTo.text,
          sender: {
            _id: replyTo.sender?._id || replyTo.sender,
            username: replyTo.sender?.username || "Unknown",
          },
        } : null,
      }
    );
    return response.data;
  } catch (error) {
    console.error("sendIndividualMessage error:", error);
    throw error;
  }
};

//  Send message via API (group)
export const sendGroupMessage = async (socket, groupId, text, attachments, replyTo, encryptionData = null) => {
  try {
    const response = await axiosInstance.post(
      `${API_BASE_URL}/api/messages/group/${groupId}/send`,
      {
        groupId,
        text: text.trim(),
        attachments,
        encryptionData,
        replyTo: replyTo ? {
          _id: replyTo._id,
          text: replyTo.text,
          sender: {
            _id: replyTo.sender?._id || replyTo.sender,
            username: replyTo.sender?.username || "Unknown",
          },
        } : null,
      }
    );
    return response.data;
  } catch (error) {
    console.error("sendGroupMessage error:", error);
    throw error;
  }
};

//  Emit typing indicator (individual)
export const emitTyping = (socket, conversationId, isTyping) => {
  if (!socket || !conversationId) return;
  socket.emit("typing", { conversationId, isTyping });
};

// Emit typing indicator (group)
export const emitGroupTyping = (socket, groupId, isTyping) => {
  if (!socket || !groupId) return;
  socket.emit("groupTyping", { groupId, isTyping });
};

//  Stop all typing indicators
export const stopAllTyping = (socket, isGroup, groupId, conversationId) => {
  if (!socket) return;
  
  if (isGroup && groupId) {
    socket.emit("groupTyping", { groupId, isTyping: false });
  } else if (conversationId) {
    socket.emit("typing", { conversationId, isTyping: false });
  }
};

//  Validate file size
export const isValidFileSize = (file, maxSizeMB = 10) => {
  const maxBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxBytes;
};

//  Get emojis list (static data)
export const getEmojisList = () => [
  "😀", "😂", "🤣", "😊", "😍", "🥰", "😎", "🤔", "🤗", "🤩",
  "😭", "😅", "😇", "🙂", "😉", "😋", "😘", "🥳", "😏", "😌",
  "👍", "👎", "👏", "🙏", "💪", "✌️", "🤝", "👋", "🤙", "🤞",
  "❤️", "💙", "💚", "💛", "🧡", "💜", "🖤", "🤍", "💔", "💕",
  "🔥", "✨", "⭐", "🌟", "💫", "🎉", "🎊", "🎈", "🎁", "🏆",
  "🎯", "💯", "✅", "❌", "⚡", "💥", "🌈", "☀️", "🌙", "⛅"
];

//  Format recording time
export const formatRecordingTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

//  Setup media recorder
export const setupMediaRecorder = (stream, onDataAvailable, onStop) => {
  const recorder = new MediaRecorder(stream);
  const audioChunks = [];
  
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) {
      audioChunks.push(e.data);
      if (onDataAvailable) onDataAvailable(audioChunks);
    }
  };
  
  recorder.onstop = async () => {
    const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
    if (onStop) await onStop(audioBlob);
    stream.getTracks().forEach((track) => track.stop());
  };
  
  return { recorder, audioChunks };
};