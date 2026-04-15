// actions/profileSettings.actions.js
import axiosInstance from "@/lib/axiosInstance";
import API_BASE_URL from "@/config/api";

// Check local auth status
export const checkLocalAuth = async () => {
  try {
    const response = await axiosInstance.get(`${API_BASE_URL}/api/auth/me`);
    return {
      authProvider: response.data.primaryProvider,
      hasPassword: response.data.hasPassword,
      hasLocalAuth: response.data.hasLocalAuth,
    };
  } catch (err) {
    console.error("Check auth error:", err);
    throw err;
  }
};

// Load blocked users
export const loadBlockedUsers = async () => {
  try {
    const response = await axiosInstance.get(`/api/friends/blocked`);
    return response.data;
  } catch (err) {
    console.error("Load blocked users error:", err);
    return [];
  }
};

// Load pending friend requests
export const loadPendingRequests = async () => {
  try {
    const response = await axiosInstance.get(`/api/friends/requests/pending`);
    return response.data;
  } catch (err) {
    console.error("Load pending requests error:", err);
    return [];
  }
};

//  Upload profile picture
export const uploadProfilePicture = async (file) => {
  const formData = new FormData();
  formData.append("image", file);

  const uploadRes = await axiosInstance.post(
    `/api/users/profile/upload`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  
  const imageUrl = uploadRes.data.imageUrl;
  
  await axiosInstance.put(`/api/users/profile/update-image`, {
    profileImage: imageUrl,
  });
  
  return imageUrl;
};

// Upload cover photo
export const uploadCoverPhoto = async (file) => {
  const formData = new FormData();
  formData.append("coverPhoto", file);

  const uploadRes = await axiosInstance.post(
    `/api/users/profile/upload-cover`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  
  const coverPhotoWithTimestamp = `${uploadRes.data.coverPhotoUrl}?t=${Date.now()}`;
  return coverPhotoWithTimestamp;
};

//  Remove cover photo
export const removeCoverPhoto = async () => {
  await axiosInstance.delete(`/api/users/profile/remove-cover`);
};

// Remove profile picture
export const removeProfilePicture = async () => {
  await axiosInstance.delete(`/api/users/profile/remove-image`);
};

//  Set password (for SSO users)
export const setPassword = async (newPassword) => {
  const response = await axiosInstance.post(
    `${API_BASE_URL}/api/auth/set-password`,
    { newPassword }
  );
  return response.data;
};

//  Change password
export const changePassword = async (oldPassword, newPassword) => {
  const response = await axiosInstance.post(
    `${API_BASE_URL}/api/auth/change-password`,
    { oldPassword, newPassword }
  );
  return response.data;
};

//  Unblock user
export const unblockUser = async (userId) => {
  await axiosInstance.delete(`/api/friends/unblock/${userId}`);
};

//  Accept friend request
export const acceptFriendRequest = async (requestId) => {
  await axiosInstance.post(`/api/friends/request/${requestId}/accept`);
};

// Reject friend request
export const rejectFriendRequest = async (requestId) => {
  await axiosInstance.delete(`/api/friends/request/${requestId}/reject`);
};