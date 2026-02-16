import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../../utils/axiosInstance";
import API_BASE_URL from "../../config/api";

// ASYNC THUNKS

export const fetchGroups = createAsyncThunk(
  "group/fetchGroups",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(
        `${API_BASE_URL}/api/groups/list`,
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  },
);

export const createGroup = createAsyncThunk(
  "group/createGroup",
  async ({ name, members, groupImage }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(
        `${API_BASE_URL}/api/groups/create`,
        {
          name,
          members,
          groupImage,
        },
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  },
);

export const fetchGroupMessages = createAsyncThunk(
  "group/fetchGroupMessages",
  async ({ groupId, currentUserId }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(
        `${API_BASE_URL}/api/messages/group/${groupId}`,
      );

      // Filter deleted messages
      const filteredMessages = response.data.filter(
        (msg) => !msg.deletedFor?.includes(currentUserId),
      );

      return { groupId, messages: filteredMessages };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  },
);

export const leaveGroup = createAsyncThunk(
  "group/leaveGroup",
  async (groupId, { rejectWithValue }) => {
    try {
      await axiosInstance.post(`${API_BASE_URL}/api/groups/${groupId}/leave`);
      return groupId;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  },
);

export const clearGroupChat = createAsyncThunk(
  "group/clearGroupChat",
  async (groupId, { rejectWithValue }) => {
    try {
      await axiosInstance.delete(`${API_BASE_URL}/api/groups/${groupId}/clear`);
      return groupId;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  },
);

// SLICE

const groupSlice = createSlice({
  name: "group",
  initialState: {
    groups: [],
    groupMessages: {}, // { groupId: { messages: [], loading: false } }
    selectedGroup: null,
    typingUsers: {}, // { groupId: Set of userIds }
    loading: false,
    error: null,
  },
  reducers: {
    setSelectedGroup: (state, action) => {
      state.selectedGroup = action.payload;
    },

    addGroupMessage: (state, action) => {
      const { groupId, message } = action.payload;

      if (!state.groupMessages[groupId]) {
        state.groupMessages[groupId] = { messages: [], loading: false };
      }

      // Avoid duplicates
      const exists = state.groupMessages[groupId].messages.some(
        (m) => m._id === message._id,
      );

      if (!exists) {
        state.groupMessages[groupId].messages.push(message);
      }
    },

    deleteGroupMessage: (state, action) => {
      const { groupId, messageId } = action.payload;

      if (state.groupMessages[groupId]) {
        state.groupMessages[groupId].messages = state.groupMessages[
          groupId
        ].messages.filter((m) => m._id !== messageId);
      }
    },

    updateGroupMessage: (state, action) => {
      const { groupId, messageId, text, editedAt } = action.payload;

      if (state.groupMessages[groupId]) {
        const message = state.groupMessages[groupId].messages.find(
          (m) => m._id === messageId,
        );
        if (message) {
          message.text = text;
          message.isEdited = true;
          message.editedAt = editedAt;
        }
      }
    },

    clearGroupChatMessages: (state, action) => {
      const groupId = action.payload;
      if (state.groupMessages[groupId]) {
        state.groupMessages[groupId].messages = [];
      }
    },

    updateGroupTyping: (state, action) => {
      const { groupId, userId, isTyping } = action.payload;
      if (!state.typingUsers[groupId]) {
        state.typingUsers[groupId] = [];
      }
      if (isTyping) {
        if (!state.typingUsers[groupId].includes(userId)) {
          state.typingUsers[groupId].push(userId);
        }
      } else {
        state.typingUsers[groupId] = state.typingUsers[groupId].filter(
          (id) => id !== userId,
        );
      }
    },

    updateGroup: (state, action) => {
      const updatedGroup = action.payload;
      state.groups = state.groups.map((g) =>
        g._id === updatedGroup._id ? updatedGroup : g,
      );

      if (state.selectedGroup?._id === updatedGroup._id) {
        state.selectedGroup = updatedGroup;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch groups
      .addCase(fetchGroups.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchGroups.fulfilled, (state, action) => {
        state.loading = false;
        state.groups = action.payload;
      })
      .addCase(fetchGroups.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Create group
      .addCase(createGroup.fulfilled, (state, action) => {
        state.groups.unshift(action.payload);
      })

      // Fetch group messages
      .addCase(fetchGroupMessages.pending, (state, action) => {
        const { groupId } = action.meta.arg;
        if (!state.groupMessages[groupId]) {
          state.groupMessages[groupId] = { messages: [], loading: true };
        } else {
          state.groupMessages[groupId].loading = true;
        }
      })
      .addCase(fetchGroupMessages.fulfilled, (state, action) => {
        const { groupId, messages } = action.payload;
        state.groupMessages[groupId] = {
          messages,
          loading: false,
        };
      })
      .addCase(fetchGroupMessages.rejected, (state, action) => {
        const { groupId } = action.meta.arg;
        if (state.groupMessages[groupId]) {
          state.groupMessages[groupId].loading = false;
        }
        state.error = action.payload;
      })

      // Leave group
      .addCase(leaveGroup.fulfilled, (state, action) => {
        const groupId = action.payload;
        state.groups = state.groups.filter((g) => g._id !== groupId);
        delete state.groupMessages[groupId];

        if (state.selectedGroup?._id === groupId) {
          state.selectedGroup = null;
        }
      })

      // Clear group chat
      .addCase(clearGroupChat.fulfilled, (state, action) => {
        const groupId = action.payload;
        if (state.groupMessages[groupId]) {
          state.groupMessages[groupId].messages = [];
        }
      })

      // Reset on logout
      .addCase("RESET_APP", () => {
        return {
          groups: [],
          groupMessages: {},
          selectedGroup: null,
          typingUsers: {},
          loading: false,
          error: null,
        };
      });
  },
});

export const {
  setSelectedGroup,
  addGroupMessage,
  deleteGroupMessage,
  updateGroupTyping,
  updateGroup,
  clearGroupChatMessages,
  updateGroupMessage,
} = groupSlice.actions;

export default groupSlice.reducer;
