import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../../utils/axiosInstance";
import API_BASE_URL from "../../config/api";

// ASYNC THUNKS

// Fetch Conversation
export const fetchConversation = createAsyncThunk(
  "chat/fetchConversation",
  async ({ otherUserId, skipCreate = false }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(
        `${API_BASE_URL}/api/messages/conversation`,
        { otherUserId, skipCreate },
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  },
);

// Fetch Messages
export const fetchMessages = createAsyncThunk(
  "chat/fetchMessages",
  async ({ conversationId, currentUserId }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(
        `${API_BASE_URL}/api/messages/${conversationId}`,
      );

      // Filter deleted messages
      const filteredMessages = response.data.filter(
        (msg) => !msg.deletedFor?.includes(currentUserId),
      );

      return { conversationId, messages: filteredMessages };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  },
);

// Send Message
export const sendMessage = createAsyncThunk(
  "chat/sendMessage",
  async ({ conversationId, text, attachments }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(
        `${API_BASE_URL}/api/messages/send`,
        { conversationId, text, attachments },
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  },
);

// Delete Message (For Me)
export const deleteMessageForMe = createAsyncThunk(
  "chat/deleteMessageForMe",
  async ({ messageId, conversationId }, { rejectWithValue }) => {
    try {
      await axiosInstance.delete(
        `${API_BASE_URL}/api/messages/message/${messageId}/for-me`,
      );
      return { messageId, conversationId };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  },
);

// Delete Message (For Everyone)
export const deleteMessageForEveryone = createAsyncThunk(
  "chat/deleteMessageForEveryone",
  async ({ messageId, conversationId }, { rejectWithValue }) => {
    try {
      await axiosInstance.delete(
        `${API_BASE_URL}/api/messages/message/${messageId}/for-everyone`,
      );
      return { messageId, conversationId };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  },
);

// Bulk Delete Messages
export const bulkDeleteMessages = createAsyncThunk(
  "chat/bulkDeleteMessages",
  async (
    { messageIds, conversationId, deleteForEveryone },
    { rejectWithValue },
  ) => {
    try {
      await axiosInstance.post(
        `${API_BASE_URL}/api/messages/messages/bulk-delete`,
        {
          messageIds,
          deleteForEveryone,
        },
      );
      return { messageIds, conversationId };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  },
);

// Edit Message
export const editMessage = createAsyncThunk(
  "chat/editMessage",
  async ({ messageId, text, conversationId }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.put(
        `${API_BASE_URL}/api/messages/message/${messageId}/edit`,
        { text },
      );
      return {
        messageId,
        text,
        conversationId,
        editedAt: response.data.editedAt,
      };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  },
);

// Clear Chat
export const clearChat = createAsyncThunk(
  "chat/clearChat",
  async (conversationId, { rejectWithValue }) => {
    try {
      await axiosInstance.patch(
        `${API_BASE_URL}/api/messages/conversation/${conversationId}/clear`,
      );
      return conversationId;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  },
);

// Delete Conversation
export const deleteConversation = createAsyncThunk(
  "chat/deleteConversation",
  async ({ conversationId, otherUserId }, { rejectWithValue }) => {
    try {
      await axiosInstance.delete(
        `${API_BASE_URL}/api/messages/conversation/${conversationId}/delete`,
        { data: { otherUserId } },
      );
      return { conversationId, otherUserId };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  },
);

// Pin Conversation
export const pinConversation = createAsyncThunk(
  "chat/pinConversation",
  async ({ conversationId, isPinned }, { rejectWithValue }) => {
    try {
      if (isPinned) {
        await axiosInstance.delete(
          `${API_BASE_URL}/api/messages/conversation/${conversationId}/unpin`,
        );
      } else {
        await axiosInstance.post(
          `${API_BASE_URL}/api/messages/conversation/${conversationId}/pin`,
        );
      }
      return { conversationId, isPinned: !isPinned };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  },
);

// Archive Conversation
export const archiveConversation = createAsyncThunk(
  "chat/archiveConversation",
  async ({ conversationId, isArchived }, { rejectWithValue }) => {
    try {
      if (isArchived) {
        await axiosInstance.delete(
          `${API_BASE_URL}/api/messages/conversation/${conversationId}/unarchive`,
        );
      } else {
        await axiosInstance.post(
          `${API_BASE_URL}/api/messages/conversation/${conversationId}/archive`,
        );
      }
      return { conversationId, isArchived: !isArchived };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  },
);

// SLICE

const chatSlice = createSlice({
  name: "chat",
  initialState: {
    conversations: {}, // { conversationId: { messages: [], loading: false } }
    selectedConversationId: null,
    unreadCounts: {}, // { userId: count }
    lastMessages: {}, // { userId: { text, time, sender, status } }
    pinnedConversations: new Set(),
    archivedConversations: new Set(),
    typingUsers: {}, // { conversationId: Set of userIds }
    loading: false,
    error: null,
  },
  reducers: {
    setSelectedConversation: (state, action) => {
      state.selectedConversationId = action.payload;
    },

  addMessage: (state, action) => {
  const { conversationId, message, userId, isGroup } = action.payload;

  if (!state.conversations[conversationId]) {
    state.conversations[conversationId] = { messages: [], loading: false };
  }

  const exists = state.conversations[conversationId].messages.some(
    (m) => m._id === message._id,
  );

  if (!exists) {
    state.conversations[conversationId].messages.push(message);
  }

  const formatAttachmentText = (attachments) => {
    if (!attachments || attachments.length === 0) return "";
    const file = attachments[0];

    if (file.isVoiceMessage) {
      const duration = file.duration || 0;
      if (duration > 0) {
        const mins = Math.floor(duration / 60);
        const secs = Math.floor(duration % 60);
        return ` Voice (${mins}:${secs.toString().padStart(2, "0")})`;
      }
      return " Voice message";
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

  const messageText = message.text || formatAttachmentText(message.attachments);
  const senderId = message.sender?._id || message.sender;
  const timestamp = Date.now(); //  Current timestamp for sorting

  // : Same logic for BOTH group and individual
  const targetKey = isGroup ? conversationId : userId;

  state.lastMessages[targetKey] = {
    text: messageText,
    time: message.createdAt || new Date().toISOString(),
    sender: senderId,
    status: message.status || "sent",
    conversationId: conversationId,
    lastMessageId: message._id,
    attachments: message.attachments || [],
    _updated: timestamp, // Same timestamp logic
    isGroup: isGroup || false,
  };

  console.log(` Updated lastMessages[${targetKey}] with _updated:`, timestamp);
},

updateMessageStatus: (state, action) => {
  const { conversationId, messageId, status } = action.payload;

  if (state.conversations[conversationId]) {
    const message = state.conversations[conversationId].messages.find(
      (m) => m._id === messageId,
    );
    if (message) {
      message.status = status;
    }
  }

  // Update in lastMessages
  Object.keys(state.lastMessages).forEach((userId) => {
    if (
      state.lastMessages[userId].lastMessageId === messageId &&
      state.lastMessages[userId].conversationId === conversationId
    ) {
      state.lastMessages[userId].status = status;
      state.lastMessages[userId]._updated = Date.now(); 
    }
  });
},

    deleteMessage: (state, action) => {
      const { conversationId, messageId } = action.payload;

      if (state.conversations[conversationId]) {
        state.conversations[conversationId].messages = state.conversations[
          conversationId
        ].messages.filter((m) => m._id !== messageId);
      }
    },

    removeMessageForEveryone: (state, action) => {
      const { conversationId, messageId } = action.payload;

      if (state.conversations[conversationId]) {
        state.conversations[conversationId].messages = state.conversations[
          conversationId
        ].messages.filter((m) => m._id !== messageId);
      }
    },

    updateMessage: (state, action) => {
      const { conversationId, messageId, text, editedAt } = action.payload;

      if (state.conversations[conversationId]) {
        const message = state.conversations[conversationId].messages.find(
          (m) => m._id === messageId,
        );
        if (message) {
          message.text = text;
          message.isEdited = true;
          message.editedAt = editedAt;
        }
      }

      // Update in lastMessages
      Object.keys(state.lastMessages).forEach((userId) => {
        if (state.lastMessages[userId].lastMessageId === messageId) {
          state.lastMessages[userId].text = text;
          state.lastMessages[userId]._updated = Date.now();
        }
      });
    },

    clearUnreadCount: (state, action) => {
      const userId = action.payload;
      state.unreadCounts[userId] = 0;
    },

    incrementUnreadCount: (state, action) => {
      const userId = action.payload;
      state.unreadCounts[userId] = (state.unreadCounts[userId] || 0) + 1;
    },

    updateTyping: (state, action) => {
      const { conversationId, userId, isTyping } = action.payload;

      if (!state.typingUsers[conversationId]) {
        state.typingUsers[conversationId] = new Set();
      }

      const typingSet = new Set(state.typingUsers[conversationId]);

      if (isTyping) {
        typingSet.add(userId);
      } else {
        typingSet.delete(userId);
      }

      state.typingUsers[conversationId] = typingSet;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Conversation
      .addCase(fetchConversation.fulfilled, (state, action) => {
        const conversationId = action.payload._id;
        if (!state.conversations[conversationId]) {
          state.conversations[conversationId] = {
            messages: [],
            loading: false,
          };
        }
      })

      // Fetch Messages
      .addCase(fetchMessages.pending, (state, action) => {
        const { conversationId } = action.meta.arg;
        if (!state.conversations[conversationId]) {
          state.conversations[conversationId] = { messages: [], loading: true };
        } else {
          state.conversations[conversationId].loading = true;
        }
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        const { conversationId, messages } = action.payload;
        state.conversations[conversationId] = {
          messages,
          loading: false,
        };
      })
      .addCase(fetchMessages.rejected, (state, action) => {
        const { conversationId } = action.meta.arg;
        if (state.conversations[conversationId]) {
          state.conversations[conversationId].loading = false;
        }
        state.error = action.payload;
      })

      // Send Message
      .addCase(sendMessage.fulfilled, (state, action) => {
        const message = action.payload;
        const conversationId = message.conversationId;

        if (state.conversations[conversationId]) {
          const exists = state.conversations[conversationId].messages.some(
            (m) => m._id === message._id,
          );
          if (!exists) {
            state.conversations[conversationId].messages.push(message);
          }
        }
      })

      // Delete Message For Me
      .addCase(deleteMessageForMe.fulfilled, (state, action) => {
        const { messageId, conversationId } = action.payload;
        if (state.conversations[conversationId]) {
          state.conversations[conversationId].messages = state.conversations[
            conversationId
          ].messages.filter((m) => m._id !== messageId);
        }
      })

      // Bulk Delete
      .addCase(bulkDeleteMessages.fulfilled, (state, action) => {
        const { messageIds, conversationId } = action.payload;
        if (state.conversations[conversationId]) {
          state.conversations[conversationId].messages = state.conversations[
            conversationId
          ].messages.filter((m) => !messageIds.includes(m._id));
        }
      })

      // Clear Chat
      .addCase(clearChat.fulfilled, (state, action) => {
        const conversationId = action.payload;
        if (state.conversations[conversationId]) {
          state.conversations[conversationId].messages = [];
        }
      })

      // Delete Conversation
      .addCase(deleteConversation.fulfilled, (state, action) => {
        const { conversationId, otherUserId } = action.payload;
        delete state.conversations[conversationId];
        delete state.lastMessages[otherUserId];
        delete state.unreadCounts[otherUserId];

        state.pinnedConversations = new Set(
          [...state.pinnedConversations].filter((id) => id !== conversationId),
        );
        state.archivedConversations = new Set(
          [...state.archivedConversations].filter(
            (id) => id !== conversationId,
          ),
        );
      })

      // Pin Conversation
      .addCase(pinConversation.fulfilled, (state, action) => {
        const { conversationId, isPinned } = action.payload;
        const pinnedSet = new Set(state.pinnedConversations);

        if (isPinned) {
          pinnedSet.add(conversationId);
        } else {
          pinnedSet.delete(conversationId);
        }

        state.pinnedConversations = pinnedSet;
      })

      // Archive Conversation
      .addCase(archiveConversation.fulfilled, (state, action) => {
        const { conversationId, isArchived } = action.payload;
        const archivedSet = new Set(state.archivedConversations);

        if (isArchived) {
          archivedSet.add(conversationId);
        } else {
          archivedSet.delete(conversationId);
        }

        state.archivedConversations = archivedSet;
      })

      // Reset on logout
      .addCase("RESET_APP", () => {
        return {
          conversations: {},
          selectedConversationId: null,
          unreadCounts: {},
          lastMessages: {},
          pinnedConversations: new Set(),
          archivedConversations: new Set(),
          typingUsers: {},
          loading: false,
          error: null,
        };
      });
  },
});

export const {
  setSelectedConversation,
  addMessage,
  updateMessageStatus,
  deleteMessage,
  removeMessageForEveryone,
  updateMessage,
  clearUnreadCount,
  incrementUnreadCount,
  updateTyping,
} = chatSlice.actions;

export default chatSlice.reducer;
