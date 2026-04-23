import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { decryptMessageHelper, decryptSharedKey } from "@/utils/cryptoUtils";
import axiosInstance from "@/lib/axiosInstance";
import API_BASE_URL from "@/config/api";

// ASYNC THUNKS

// Decrypt and Store Shared Key
export const decryptAndStoreSharedKey = createAsyncThunk(
  "chat/decryptAndStoreSharedKey",
  async (
    { conversationId, sharedEncryptedKeys, currentUserId },
    { rejectWithValue },
  ) => {
    try {
      const encryptedKey = sharedEncryptedKeys[currentUserId];
      if (!encryptedKey)
        return rejectWithValue("No encrypted key for current user");

      const privateKey = localStorage.getItem(`chat_sk_${currentUserId}`);
      if (!privateKey) return rejectWithValue("No private key found");

      const sharedKey = await decryptSharedKey(encryptedKey, privateKey);
      return { conversationId, sharedKey };
    } catch (error) {
      return rejectWithValue("Failed to decrypt shared key");
    }
  },
);

// Fetch Conversation
export const fetchConversation = createAsyncThunk(
  "chat/fetchConversation",
  async (
    { otherUserId, skipCreate = false },
    { dispatch, getState, rejectWithValue },
  ) => {
    try {
      const response = await axiosInstance.post(
        `${API_BASE_URL}/api/messages/conversation`,
        { otherUserId, skipCreate },
      );

      const conversation = response.data;
      const { currentUserId } = getState().auth;

      if (conversation.sharedEncryptedKeys && currentUserId) {
        try {
          await dispatch(
            decryptAndStoreSharedKey({
              conversationId: conversation._id,
              sharedEncryptedKeys: conversation.sharedEncryptedKeys,
              currentUserId,
            }),
          ).unwrap();
        } catch (err) {
          console.warn(
            "Key decryption failed, continuing without shared key:",
            err,
          );
        }
      }

      return conversation;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  },
);

// Fetch Messages
export const fetchMessages = createAsyncThunk(
  "chat/fetchMessages",
  async ({ conversationId, currentUserId }, { getState, rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(
        `${API_BASE_URL}/api/messages/${conversationId}`,
      );

      // Filter deleted messages
      const filteredMessages = response.data.filter(
        (msg) => !msg.deletedFor?.includes(currentUserId),
      );

      // Get shared key for this conversation
      const sharedKey = getState().chat.sharedKeys[conversationId];

      const decryptedMessages = await Promise.all(
        filteredMessages.map(async (msg) => {
          msg.text = await decryptMessageHelper(msg, currentUserId, sharedKey);
          return msg;
        }),
      );

      return { conversationId, messages: decryptedMessages };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  },
);

// Send Message (unified for individual and group)
export const sendMessage = createAsyncThunk(
  "chat/sendMessage",
  async (
    {
      conversationId,
      groupId,
      isGroup = false,
      text,
      attachments,
      encryptionData,
      replyTo,
    },
    { rejectWithValue },
  ) => {
    try {
      const body = {
        text,
        attachments,
        encryptionData,
        replyTo,
        ...(isGroup ? { groupId } : { conversationId }),
      };
      const response = await axiosInstance.post(
        `${API_BASE_URL}/api/messages/send`,
        body,
      );
      return { ...response.data, isGroup, groupId, conversationId };
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
    selectedUserId: null,
    unreadCounts: {}, // { userId: count }
    lastMessages: {}, // { userId: { text, time, sender, status } }
    pinnedConversations: [],
    archivedConversations: [],
    typingUsers: {}, // { conversationId: Set of userIds }
    sharedKeys: {}, // { conversationId: CryptoKey }
    loading: false,
    error: null,
  },
  reducers: {
    setSelectedConversation: (state, action) => {
      state.selectedConversationId = action.payload;
    },

    setSelectedUserId: (state, action) => {
      state.selectedUserId = action.payload;
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
      let messageText = "";
      if (message.isCallRecord) {
        const icon = message.callType === "video" ? "📹" : "📞";
        if (message.callStatus === "missed")
          messageText = `${icon} Missed Call`;
        else if (message.callStatus === "rejected")
          messageText = `${icon} Call Declined`;
        else if (message.callStatus === "cancelled")
          messageText = `${icon} Cancelled`;
        else if (message.callDuration > 0) {
          const mins = Math.floor(message.callDuration / 60);
          const secs = message.callDuration % 60;
          messageText = `${icon} ${mins > 0 ? mins + "m " : ""}${secs}s`;
        } else {
          messageText = `${icon} Call`;
        }
      } else {
        messageText = message.text || formatAttachmentText(message.attachments);
      }
      const senderId = message.sender?._id || message.sender;

      //  USE MESSAGE CREATION TIME (not current time) for sorting
      const timestamp =
        message._loadedTimestamp ||
        new Date(message.createdAt).getTime() ||
        Date.now();

      const targetKey = isGroup ? `group_${conversationId}` : userId;
      if (!isGroup && state.lastMessages[targetKey]?.isGroup === true) {
        return;
      }

      state.lastMessages[targetKey] = {
        text: messageText || "",
        time: message.createdAt || new Date().toISOString(),
        sender: senderId,
        status: message.status || "sent",
        conversationId: conversationId,
        lastMessageId: message._id,
        attachments: message.attachments || [],
        _updated: timestamp,
        isGroup: isGroup || false,
        isCallRecord: message.isCallRecord || false,
        callType: message.callType || null,
        callStatus: message.callStatus || null,
        callDuration: message.callDuration || 0,
      };
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
    updateGroupMessageInSidebar: (state, action) => {
      const { groupId, messageId, text, editedAt } = action.payload;

      // Update in lastMessages for sidebar
      if (state.lastMessages[`group_${groupId}`]) {
        if (
          state.lastMessages[`group_${groupId}`].lastMessageId === messageId
        ) {
          state.lastMessages[`group_${groupId}`].text = text;
          state.lastMessages[`group_${groupId}`].isEdited = true;
          state.lastMessages[`group_${groupId}`].editedAt = editedAt;
          state.lastMessages[`group_${groupId}`]._updated = Date.now();
        }
      }
    },
    clearMessages: (state, action) => {
      const conversationId = action.payload;
      if (state.conversations[conversationId]) {
        state.conversations[conversationId].messages = [];
      }
    },

    updateLastMessage: (state, action) => {
      const { userId, conversationId, text, timestamp } = action.payload;
      state.lastMessages[userId] = {
        ...state.lastMessages[userId],
        text: text,
        time: new Date(timestamp).toISOString(),
        conversationId: conversationId,
        _updated: timestamp,
      };
    },
    clearUnreadCount: (state, action) => {
      const userId = action.payload;
      state.unreadCounts[userId] = 0;
    },

    incrementUnreadCount: (state, action) => {
      const userId = action.payload;
      if (state.selectedUserId === userId) return;
      state.unreadCounts[userId] = (state.unreadCounts[userId] || 0) + 1;
    },

    updateTyping: (state, action) => {
      const { conversationId, userId, isTyping } = action.payload;
      if (!state.typingUsers[conversationId]) {
        state.typingUsers[conversationId] = [];
      }
      if (isTyping) {
        if (!state.typingUsers[conversationId].includes(userId)) {
          state.typingUsers[conversationId].push(userId);
        }
      } else {
        state.typingUsers[conversationId] = state.typingUsers[
          conversationId
        ].filter((id) => id !== userId);
      }
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
      .addCase("chat/decryptAndStoreSharedKey/fulfilled", (state, action) => {
        const { conversationId, sharedKey } = action.payload;
        state.sharedKeys[conversationId] = sharedKey;
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
        delete state.sharedKeys[conversationId];

        state.pinnedConversations = state.pinnedConversations.filter(
          (id) => id !== conversationId,
        );
        state.archivedConversations = state.archivedConversations.filter(
          (id) => id !== conversationId,
        );
      })
      // Pin Conversation

      .addCase(pinConversation.fulfilled, (state, action) => {
        const { conversationId, isPinned } = action.payload;
        if (isPinned) {
          if (!state.pinnedConversations.includes(conversationId)) {
            state.pinnedConversations.push(conversationId);
          }
        } else {
          state.pinnedConversations = state.pinnedConversations.filter(
            (id) => id !== conversationId,
          );
        }
      })

      // Archive Conversation

      .addCase(archiveConversation.fulfilled, (state, action) => {
        const { conversationId, isArchived } = action.payload;
        if (isArchived) {
          if (!state.archivedConversations.includes(conversationId)) {
            state.archivedConversations.push(conversationId);
          }
        } else {
          state.archivedConversations = state.archivedConversations.filter(
            (id) => id !== conversationId,
          );
        }
      })

      // Reset on logout
      .addCase("RESET_APP", () => {
        return {
          conversations: {},
          selectedConversationId: null,
          selectedUserId: null,
          unreadCounts: {},
          lastMessages: {},
          pinnedConversations: [],
          archivedConversations: [],
          typingUsers: {},
          loading: false,
          error: null,
        };
      });
  },
});

export const {
  setSelectedConversation,
  setSelectedUserId,
  addMessage,
  updateMessageStatus,
  deleteMessage,
  removeMessageForEveryone,
  updateMessage,
  updateGroupMessageInSidebar,
  clearUnreadCount,
  incrementUnreadCount,
  updateTyping,
  clearMessages,
  updateLastMessage,
} = chatSlice.actions;

export default chatSlice.reducer;
