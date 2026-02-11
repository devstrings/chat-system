import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../../utils/axiosInstance";
import API_BASE_URL from "../../config/api";

//  ASYNC THUNKS

// Login
export const login = createAsyncThunk(
  "auth/login",
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(
        `${API_BASE_URL}/api/auth/login`,
        {
          email,
          password,
        },
      );

      const { refreshToken, username, profileImage } = response.data;

      //  ONLY save refreshToken, username, profileImage
      localStorage.setItem("refreshToken", refreshToken);
      localStorage.setItem("username", username);
      if (profileImage) {
        localStorage.setItem("profileImage", profileImage);
      }

      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Login failed");
    }
  },
);

// Register
export const register = createAsyncThunk(
  "auth/register",
  async ({ username, email, password }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(
        `${API_BASE_URL}/api/auth/register`,
        {
          username,
          email,
          password,
        },
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Registration failed",
      );
    }
  },
);

// Logout
export const logout = createAsyncThunk(
  "auth/logout",
  async (_, { dispatch }) => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("username");
    localStorage.removeItem("profileImage");

    // Reset all slices
    dispatch({ type: "RESET_APP" });

    return null;
  },
);

// Fetch Current User
export const fetchCurrentUser = createAsyncThunk(
  "auth/fetchCurrentUser",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(
        `${API_BASE_URL}/api/users/auth/me`,
      );
      return response.data;
    } catch (error) {
      console.error(" fetchCurrentUser failed:", error.response?.status);
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch user",
      );
    }
  },
);

// Update Profile Image
export const updateProfileImage = createAsyncThunk(
  "auth/updateProfileImage",
  async ({ imageFile, isCoverPhoto }, { rejectWithValue }) => {
    try {
      const formData = new FormData();

      if (isCoverPhoto) {
        formData.append("coverPhoto", imageFile);
      } else {
        formData.append("image", imageFile);
      }

      const uploadUrl = isCoverPhoto
        ? `${API_BASE_URL}/api/users/profile/upload-cover`
        : `${API_BASE_URL}/api/users/profile/upload`;

      const uploadRes = await axiosInstance.post(uploadUrl, formData);

      const imageUrl = isCoverPhoto
        ? uploadRes.data.coverPhotoUrl
        : uploadRes.data.imageUrl;

      // Update user profile
      const updateUrl = isCoverPhoto
        ? `${API_BASE_URL}/api/users/profile/update-cover`
        : `${API_BASE_URL}/api/users/profile/update-image`;

      const updateRes = await axiosInstance.put(updateUrl, {
        [isCoverPhoto ? "coverPhoto" : "profileImage"]: imageUrl,
      });

      return { imageUrl, isCoverPhoto };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  },
);

// Change Password
export const changePassword = createAsyncThunk(
  "auth/changePassword",
  async ({ oldPassword, newPassword }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(
        `${API_BASE_URL}/api/auth/change-password`,
        { oldPassword, newPassword },
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  },
);

// SLICE

const authSlice = createSlice({
  name: "auth",
  initialState: {
    isAuthenticated: false,
    currentUser: null,
    currentUserId: null,
    token: localStorage.getItem("accessToken") || null,
    loading: false,
    error: null,
    userFetched: false,
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },

    setUser: (state, action) => {
      state.currentUser = action.payload;
      state.currentUserId = action.payload?._id;
    },
    updateToken: (state, action) => {
      state.token = action.payload;
      console.log(
        " Token updated in Redux:",
        action.payload.substring(0, 20) + "...",
      );
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.token = action.payload.accessToken;
        state.currentUser = action.payload;
        state.currentUserId = action.payload._id || action.payload.id;
        state.error = null;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.isAuthenticated = false;
      })

      // Register
      .addCase(register.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Logout
      .addCase(logout.fulfilled, (state) => {
        state.isAuthenticated = false;
        state.currentUser = null;
        state.currentUserId = null;
        state.token = null;
        state.loading = false;
        state.error = null;
      })

      // Fetch Current User
      .addCase(fetchCurrentUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.loading = false;
        state.currentUser = action.payload;
        state.currentUserId = action.payload._id;
        state.isAuthenticated = true;
        state.error = null;
        state.userFetched = true;
      })
      .addCase(fetchCurrentUser.rejected, (state) => {
        state.loading = false;
        state.isAuthenticated = false;
      })

      // Update Profile Image
      .addCase(updateProfileImage.fulfilled, (state, action) => {
        const { imageUrl, isCoverPhoto } = action.payload;
        if (state.currentUser) {
          if (isCoverPhoto) {
            state.currentUser.coverPhoto = imageUrl;
          } else {
            state.currentUser.profileImage = imageUrl;
          }
        }
      })

      // Change Password
      .addCase(changePassword.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(changePassword.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(changePassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Reset on RESET_APP
      .addCase("RESET_APP", () => {
        return {
          isAuthenticated: false,
          currentUser: null,
          currentUserId: null,
          token: null,
          loading: false,
          error: null,
        };
      });
  },
});

export const { clearError, setUser, updateToken } = authSlice.actions;

export default authSlice.reducer;
