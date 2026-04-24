import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "@/lib/axiosInstance";
import API_BASE_URL from "@/config/api";

export const checkLocalAuth = createAsyncThunk(
  "profileSettings/checkLocalAuth",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(`${API_BASE_URL}/api/auth/me`);
      return {
        authProvider: response.data.primaryProvider,
        hasPassword: response.data.hasPassword,
        hasLocalAuth: response.data.hasLocalAuth,
      };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Check auth failed");
    }
  },
);

export const loadBlockedUsers = createAsyncThunk(
  "profileSettings/loadBlockedUsers",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("/api/friends/blocked");
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Load blocked users failed",
      );
    }
  },
);

export const loadPendingRequests = createAsyncThunk(
  "profileSettings/loadPendingRequests",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("/api/friends/requests/pending");
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Load pending requests failed",
      );
    }
  },
);

export const uploadProfilePicture = createAsyncThunk(
  "profileSettings/uploadProfilePicture",
  async (file, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append("image", file);
      const uploadRes = await axiosInstance.post("/api/users/profile/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const imageUrl = uploadRes.data.imageUrl;
      await axiosInstance.put("/api/users/profile/update-image", { profileImage: imageUrl });
      return imageUrl;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Upload profile picture failed",
      );
    }
  },
);

export const uploadCoverPhoto = createAsyncThunk(
  "profileSettings/uploadCoverPhoto",
  async (file, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append("coverPhoto", file);
      const uploadRes = await axiosInstance.post("/api/users/profile/upload-cover", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return `${uploadRes.data.coverPhotoUrl}?t=${Date.now()}`;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Upload cover photo failed");
    }
  },
);

export const removeCoverPhoto = createAsyncThunk(
  "profileSettings/removeCoverPhoto",
  async (_, { rejectWithValue }) => {
    try {
      await axiosInstance.delete("/api/users/profile/remove-cover");
      return true;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Remove cover photo failed");
    }
  },
);

export const removeProfilePicture = createAsyncThunk(
  "profileSettings/removeProfilePicture",
  async (_, { rejectWithValue }) => {
    try {
      await axiosInstance.delete("/api/users/profile/remove-image");
      return true;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Remove profile picture failed");
    }
  },
);

export const setPassword = createAsyncThunk(
  "profileSettings/setPassword",
  async (newPassword, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(`${API_BASE_URL}/api/auth/set-password`, {
        newPassword,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Set password failed");
    }
  },
);

export const changePassword = createAsyncThunk(
  "profileSettings/changePassword",
  async ({ oldPassword, newPassword }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(`${API_BASE_URL}/api/auth/change-password`, {
        oldPassword,
        newPassword,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Change password failed");
    }
  },
);

export const unblockUser = createAsyncThunk(
  "profileSettings/unblockUser",
  async (userId, { rejectWithValue }) => {
    try {
      await axiosInstance.delete(`/api/friends/unblock/${userId}`);
      return userId;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Unblock user failed");
    }
  },
);

export const acceptFriendRequest = createAsyncThunk(
  "profileSettings/acceptFriendRequest",
  async (requestId, { rejectWithValue }) => {
    try {
      await axiosInstance.post(`/api/friends/request/${requestId}/accept`);
      return requestId;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Accept friend request failed");
    }
  },
);

export const rejectFriendRequest = createAsyncThunk(
  "profileSettings/rejectFriendRequest",
  async (requestId, { rejectWithValue }) => {
    try {
      await axiosInstance.delete(`/api/friends/request/${requestId}/reject`);
      return requestId;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Reject friend request failed");
    }
  },
);

export const get2FAStatus = createAsyncThunk(
  "profileSettings/get2FAStatus",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("/api/auth/2fa/status");
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Get 2FA status failed");
    }
  },
);

export const startTOTPSetup = createAsyncThunk(
  "profileSettings/startTOTPSetup",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post("/api/auth/2fa/totp/setup/start");
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Start TOTP setup failed");
    }
  },
);

export const verifyTOTPSetup = createAsyncThunk(
  "profileSettings/verifyTOTPSetup",
  async (code, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post("/api/auth/2fa/totp/setup/verify", {
        code,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Verify TOTP setup failed");
    }
  },
);

export const startEmail2FASetup = createAsyncThunk(
  "profileSettings/startEmail2FASetup",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post("/api/auth/2fa/email/setup/start");
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Start email 2FA failed");
    }
  },
);

export const verifyEmail2FASetup = createAsyncThunk(
  "profileSettings/verifyEmail2FASetup",
  async (code, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post("/api/auth/2fa/email/setup/verify", {
        code,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Verify email 2FA failed");
    }
  },
);

export const disable2FA = createAsyncThunk(
  "profileSettings/disable2FA",
  async ({ password, code }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post("/api/auth/2fa/disable", {
        password,
        code,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Disable 2FA failed");
    }
  },
);

export const listPersonalAccessTokens = createAsyncThunk(
  "profileSettings/listPersonalAccessTokens",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("/api/auth/personal-access-tokens");
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "List personal access tokens failed",
      );
    }
  },
);

export const createPersonalAccessToken = createAsyncThunk(
  "profileSettings/createPersonalAccessToken",
  async ({ name, expiresInDays, code }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post("/api/auth/personal-access-tokens", {
        name,
        expiresInDays: expiresInDays || undefined,
        code,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Create personal access token failed",
      );
    }
  },
);

export const revokePersonalAccessToken = createAsyncThunk(
  "profileSettings/revokePersonalAccessToken",
  async (tokenId, { rejectWithValue }) => {
    try {
      await axiosInstance.delete(`/api/auth/personal-access-tokens/${tokenId}`);
      return tokenId;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Revoke personal access token failed",
      );
    }
  },
);

export const saveKeyBackupToCloud = createAsyncThunk(
  "profileSettings/saveKeyBackupToCloud",
  async ({ publicKey, privateKey }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post("/api/auth/key-backup", {
        publicKey,
        privateKey,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Save key backup failed");
    }
  },
);

export const fetchKeyBackupFromCloud = createAsyncThunk(
  "profileSettings/fetchKeyBackupFromCloud",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("/api/auth/key-backup");
      return response.data?.keyBackup || null;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Fetch key backup failed");
    }
  },
);

export const rotateEncryptionKeys = createAsyncThunk(
  "profileSettings/rotateEncryptionKeys",
  async ({ publicKey, conversationKeys }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post("/api/auth/public-key/rotate", {
        publicKey,
        conversationKeys,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Rotate encryption keys failed");
    }
  },
);

const profileSettingsSlice = createSlice({
  name: "profileSettings",
  initialState: {
    authInfo: null,
    blockedUsers: [],
    pendingRequests: [],
    twoFactorStatus: null,
    patList: [],
    keyBackup: null,
    loading: false,
    error: null,
  },
  reducers: {
    clearProfileSettingsError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(checkLocalAuth.fulfilled, (state, action) => {
        state.authInfo = action.payload;
      })
      .addCase(loadBlockedUsers.fulfilled, (state, action) => {
        state.blockedUsers = action.payload || [];
      })
      .addCase(loadPendingRequests.fulfilled, (state, action) => {
        state.pendingRequests = action.payload || [];
      })
      .addCase(get2FAStatus.fulfilled, (state, action) => {
        state.twoFactorStatus = action.payload;
      })
      .addCase(listPersonalAccessTokens.fulfilled, (state, action) => {
        state.patList = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(fetchKeyBackupFromCloud.fulfilled, (state, action) => {
        state.keyBackup = action.payload;
      })
      .addMatcher(
        (action) =>
          action.type.startsWith("profileSettings/") &&
          action.type.endsWith("/pending"),
        (state) => {
          state.loading = true;
          state.error = null;
        },
      )
      .addMatcher(
        (action) =>
          action.type.startsWith("profileSettings/") &&
          action.type.endsWith("/rejected"),
        (state, action) => {
          state.loading = false;
          state.error = action.payload || "Request failed";
        },
      )
      .addMatcher(
        (action) =>
          action.type.startsWith("profileSettings/") &&
          action.type.endsWith("/fulfilled"),
        (state) => {
          state.loading = false;
        },
      );
  },
});

export const { clearProfileSettingsError } = profileSettingsSlice.actions;
export default profileSettingsSlice.reducer;
