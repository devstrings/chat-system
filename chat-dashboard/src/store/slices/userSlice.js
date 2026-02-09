import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '../../utils/axiosInstance';
import API_BASE_URL from '../../config/api';

// ASYNC THUNKS 

export const fetchFriendsList = createAsyncThunk(
  'user/fetchFriendsList',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(`${API_BASE_URL}/api/friends/list`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  }
);

export const sendFriendRequest = createAsyncThunk(
  'user/sendFriendRequest',
  async (receiverId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(
        `${API_BASE_URL}/api/friends/request/send`,
        { receiverId }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  }
);

export const acceptFriendRequest = createAsyncThunk(
  'user/acceptFriendRequest',
  async (requestId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(
        `${API_BASE_URL}/api/friends/request/${requestId}/accept`
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  }
);

export const rejectFriendRequest = createAsyncThunk(
  'user/rejectFriendRequest',
  async (requestId, { rejectWithValue }) => {
    try {
      await axiosInstance.delete(
        `${API_BASE_URL}/api/friends/request/${requestId}/reject`
      );
      return requestId;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  }
);

export const fetchPendingRequests = createAsyncThunk(
  'user/fetchPendingRequests',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(
        `${API_BASE_URL}/api/friends/requests/pending`
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  }
);

export const fetchBlockedUsers = createAsyncThunk(
  'user/fetchBlockedUsers',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(`${API_BASE_URL}/api/friends/blocked`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  }
);

export const blockUser = createAsyncThunk(
  'user/blockUser',
  async (userId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(`${API_BASE_URL}/api/friends/block`, {
        userId,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  }
);

export const unblockUser = createAsyncThunk(
  'user/unblockUser',
  async (userId, { rejectWithValue }) => {
    try {
      await axiosInstance.delete(`${API_BASE_URL}/api/friends/unblock/${userId}`);
      return userId;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  }
);

//  SLICE 

const userSlice = createSlice({
  name: 'user',
  initialState: {
    friends: [],
    onlineUsers: new Set(),
    pendingRequests: [],
    blockedUsers: [],
    loading: false,
    error: null,
  },
  reducers: {
    setOnlineUsers: (state, action) => {
      state.onlineUsers = new Set(action.payload);
    },
    
    addOnlineUser: (state, action) => {
      state.onlineUsers = new Set([...state.onlineUsers, action.payload]);
    },
    
    removeOnlineUser: (state, action) => {
      const newSet = new Set(state.onlineUsers);
      newSet.delete(action.payload);
      state.onlineUsers = newSet;
    },
    
    addFriendRequest: (state, action) => {
      state.pendingRequests.push(action.payload);
    },
    
    removeFriendRequest: (state, action) => {
      state.pendingRequests = state.pendingRequests.filter(
        (req) => req._id !== action.payload
      );
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch friends
      .addCase(fetchFriendsList.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchFriendsList.fulfilled, (state, action) => {
        state.loading = false;
        state.friends = action.payload;
      })
      .addCase(fetchFriendsList.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Send friend request
      .addCase(sendFriendRequest.fulfilled, (state) => {
        state.error = null;
      })
      .addCase(sendFriendRequest.rejected, (state, action) => {
        state.error = action.payload;
      })
      
      // Accept request
      .addCase(acceptFriendRequest.fulfilled, (state, action) => {
        state.pendingRequests = state.pendingRequests.filter(
          (req) => req._id !== action.payload._id
        );
      })
      
      // Reject request
      .addCase(rejectFriendRequest.fulfilled, (state, action) => {
        state.pendingRequests = state.pendingRequests.filter(
          (req) => req._id !== action.payload
        );
      })
      
      // Fetch pending requests
      .addCase(fetchPendingRequests.fulfilled, (state, action) => {
        state.pendingRequests = action.payload;
      })
      
      // Fetch blocked users
      .addCase(fetchBlockedUsers.fulfilled, (state, action) => {
        state.blockedUsers = action.payload;
      })
      
      // Block user
      .addCase(blockUser.fulfilled, (state, action) => {
        state.blockedUsers.push(action.payload);
      })
      
      // Unblock user
      .addCase(unblockUser.fulfilled, (state, action) => {
        state.blockedUsers = state.blockedUsers.filter(
          (block) => block.blocked._id !== action.payload
        );
      })
      
      // Reset on logout
      .addCase('RESET_APP', () => {
        return {
          friends: [],
          onlineUsers: new Set(),
          pendingRequests: [],
          blockedUsers: [],
          loading: false,
          error: null,
        };
      });
  },
});

export const {
  setOnlineUsers,
  addOnlineUser,
  removeOnlineUser,
  addFriendRequest,
  removeFriendRequest,
} = userSlice.actions;

export default userSlice.reducer;