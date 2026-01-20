import React, { useState, useRef, useEffect } from "react";
import { useAuthImage } from "../hooks/useAuthImage";
import axios from "axios";

export default function ProfileSettings({
  currentUser,
  onClose,
  onProfileImageUpdate,
  coverPhotoUrl,
  initialView = "all",
}) {
  const [showPhotoMenu, setShowPhotoMenu] = useState(false);
  const [loading, setLoading] = useState(false);
  const [coverPhotoPreview, setCoverPhotoPreview] = useState(null);
  const [coverPhotoLoading, setCoverPhotoLoading] = useState(false);
  const coverFileInputRef = useRef(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [hasLocalAuth, setHasLocalAuth] = useState(false);
  const [authProvider, setAuthProvider] = useState(null);
  const [hasPassword, setHasPassword] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);
  const [changePasswordError, setChangePasswordError] = useState("");
  const [changePasswordSuccess, setChangePasswordSuccess] = useState("");

  const { imageSrc: profilePreview, loading: imageLoading } = useAuthImage(
    currentUser?.profileImage,
  );

  const [blockedUsers, setBlockedUsers] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [notifications, setNotifications] = useState({
    messageNotifications: true,
    friendRequests: true,
    soundEnabled: true,
  });

  const { imageSrc: coverPreview, loading: coverImageLoading } = useAuthImage(
    coverPhotoPreview || coverPhotoUrl || currentUser?.coverPhoto,
  );

  const fileInputRef = useRef(null);
  const photoMenuRef = useRef(null);

  //Check if user has local auth
  useEffect(() => {
    checkLocalAuth();
  }, []);

  const checkLocalAuth = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get("http://localhost:5000/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log(" User info:", response.data);
      console.log(" primaryProvider:", response.data.primaryProvider);
      console.log(" hasPassword:", response.data.hasPassword);
      console.log(" hasLocalAuth:", response.data.hasLocalAuth);

      setAuthProvider(response.data.primaryProvider);
      setHasPassword(response.data.hasPassword);
      setHasLocalAuth(response.data.hasLocalAuth);
    } catch (err) {
      console.error("Check auth error:", err);
    }
  };
  useEffect(() => {
    loadBlockedUsers();
    loadPendingRequests();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        photoMenuRef.current &&
        !photoMenuRef.current.contains(event.target)
      ) {
        setShowPhotoMenu(false);
      }
    };
    if (showPhotoMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showPhotoMenu]);

  const loadBlockedUsers = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:5000/api/friends/blocked", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setBlockedUsers(data);
    } catch (err) {
      console.error("Load blocked users error:", err);
    }
  };

  const loadPendingRequests = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        "http://localhost:5000/api/friends/requests/pending",
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const data = await res.json();
      setPendingRequests(data);
    } catch (err) {
      console.error("Load requests error:", err);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current.click();
    setShowPhotoMenu(false);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("image", file);

      const uploadRes = await fetch(
        "http://localhost:5000/api/users/profile/upload",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        },
      );
      const uploadData = await uploadRes.json();
      const imageUrl = uploadData.imageUrl;

      await fetch("http://localhost:5000/api/users/profile/update-image", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ profileImage: imageUrl }),
      });

      onProfileImageUpdate(imageUrl);
      alert("Profile picture uploaded successfully!");
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Failed to upload profile picture");
    } finally {
      setLoading(false);
    }
  };

  const handleCoverPhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setCoverPhotoLoading(true);
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("coverPhoto", file);

      const uploadRes = await fetch(
        "http://localhost:5000/api/users/profile/upload-cover",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        },
      );

      if (!uploadRes.ok) {
        throw new Error("Upload failed");
      }

      const uploadData = await uploadRes.json();
      const coverPhotoWithTimestamp = `${uploadData.coverPhotoUrl}?t=${Date.now()}`;

      onProfileImageUpdate(coverPhotoWithTimestamp, true);
      setCoverPhotoPreview(coverPhotoWithTimestamp);

      alert("Cover photo uploaded successfully!");
    } catch (err) {
      console.error("Cover upload failed:", err);
      alert("Failed to upload cover photo");
    } finally {
      setCoverPhotoLoading(false);
    }
  };

  const handleRemoveCoverPhoto = async () => {
    setCoverPhotoLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        "http://localhost:5000/api/users/profile/remove-cover",
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (!response.ok) {
        throw new Error("Remove failed");
      }

      onProfileImageUpdate(null, true);
      setCoverPhotoPreview(null);

      alert("Cover photo removed successfully");
    } catch (err) {
      console.error("Remove cover failed:", err);
      alert("Failed to remove cover photo");
    } finally {
      setCoverPhotoLoading(false);
    }
  };

  const handleRemoveImage = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      await fetch("http://localhost:5000/api/users/profile/remove-image", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      onProfileImageUpdate(null);
      setShowPhotoMenu(false);
      alert("Profile picture removed successfully");
    } catch (err) {
      console.error("Remove failed:", err);
      alert("Failed to remove profile picture");
    } finally {
      setLoading(false);
    }
  };

  // Set Password Handler
  const handleSetPassword = async (e) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    setPasswordLoading(true);

    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        "http://localhost:5000/api/auth/set-password",
        { newPassword },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      setPasswordSuccess(response.data.message);
      setNewPassword("");
      setConfirmPassword("");

      setHasPassword(true);

      //  RELOAD USER DATA
      await checkLocalAuth();

      setTimeout(() => {
        setPasswordSuccess("Password set successfully! Refreshing...");
        window.location.reload();
      }, 1000);
    } catch (err) {
      console.error(" Set Password Error:", err.response?.data);
      setPasswordError(err.response?.data?.message || "Failed to set password");
    } finally {
      setPasswordLoading(false);
    }
  };
  // Add handler
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setChangePasswordError("");
    setChangePasswordSuccess("");

    // Validation
    if (!oldPassword) {
      setChangePasswordError("Current password is required");
      return;
    }

    if (newPassword.length < 6) {
      setChangePasswordError("New password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setChangePasswordError("Passwords do not match");
      return;
    }

    if (oldPassword === newPassword) {
      setChangePasswordError("New password must be different");
      return;
    }

    setChangePasswordLoading(true);

    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        "http://localhost:5000/api/auth/change-password",
        { oldPassword, newPassword },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      setChangePasswordSuccess(response.data.message);
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");

      //  RELOAD USER DATA
      await checkLocalAuth();

      setTimeout(() => {
        setChangePasswordSuccess("");
      }, 5000);
    } catch (err) {
      setChangePasswordError(
        err.response?.data?.message || "Failed to change password",
      );
    } finally {
      setChangePasswordLoading(false);
    }
  };
  const handleUnblockUser = async (userId) => {
    try {
      const token = localStorage.getItem("token");
      await fetch(`http://localhost:5000/api/friends/unblock/${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setBlockedUsers(blockedUsers.filter((b) => b.blocked._id !== userId));
      alert("User unblocked successfully!");
    } catch (err) {
      console.error("Unblock failed:", err);
      alert("Failed to unblock user");
    }
  };

  const handleAcceptRequest = async (requestId) => {
    try {
      const token = localStorage.getItem("token");
      await fetch(
        `http://localhost:5000/api/friends/request/${requestId}/accept`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setPendingRequests(pendingRequests.filter((r) => r._id !== requestId));
      alert("Friend request accepted!");
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      console.error("Accept failed:", err);
      alert("Failed to accept request");
    }
  };

  const handleRejectRequest = async (requestId) => {
    try {
      const token = localStorage.getItem("token");
      await fetch(
        `http://localhost:5000/api/friends/request/${requestId}/reject`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setPendingRequests(pendingRequests.filter((r) => r._id !== requestId));
      alert("Friend request rejected");
    } catch (err) {
      console.error("Reject failed:", err);
      alert("Failed to reject request");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-white px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            Profile Settings
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-900"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Profile Section with Cover Photo */}
          {(initialView === "all" ||
            initialView === "profile" ||
            initialView === "settings") && (
            <div className="bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
              {/* Cover Photo Section */}
              <div className="relative h-32 bg-gradient-to-r from-blue-500 to-purple-600">
                {coverImageLoading ? (
                  <div className="w-full h-full bg-gray-700 animate-pulse" />
                ) : coverPreview ? (
                  <img
                    src={coverPreview}
                    alt="cover"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-r from-blue-500 to-purple-600" />
                )}

                <button
                  onClick={() => coverFileInputRef.current.click()}
                  className="absolute top-2 right-2 p-2 bg-gray-800 bg-opacity-70 hover:bg-opacity-90 rounded-full transition-colors"
                  title="Change cover photo"
                >
                  <svg
                    className="w-4 h-4 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </button>

                {currentUser?.coverPhoto && (
                  <button
                    onClick={handleRemoveCoverPhoto}
                    className="absolute top-2 right-12 p-2 bg-red-600 bg-opacity-70 hover:bg-opacity-90 rounded-full transition-colors"
                    title="Remove cover photo"
                  >
                    <svg
                      className="w-4 h-4 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                )}
              </div>

              {/* Profile Info */}
              <div className="px-6 pb-6">
                <div className="flex items-end gap-4 -mt-6 pt-2">
                  <div className="relative flex-shrink-0">
                    <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-lg">
                      <img
                        src={profilePreview}
                        alt="profile"
                        className="w-full h-full object-cover"
                        crossOrigin="anonymous"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          console.log(" Image failed to load:", profilePreview);
                          // Fallback to original size if s400-c fails
                          if (profilePreview.includes("s400-c")) {
                            const originalUrl = profilePreview.replace(
                              "s400-c",
                              "s96-c",
                            );
                            console.log(" Trying original size:", originalUrl);
                            e.target.src = originalUrl;
                          }
                        }}
                        onLoad={() => console.log(" Image loaded successfully")}
                      />

                      <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-3xl font-semibold">
                        {currentUser?.username?.charAt(0)?.toUpperCase() || "U"}
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 pt-4">
                    <p className="text-gray-900 font-semibold text-lg mb-1">
                      {currentUser?.username || "User"}
                    </p>
                    <p className="text-gray-600 text-sm mb-3">
                      {currentUser?.email || "email@example.com"}
                    </p>

                    <div className="relative" ref={photoMenuRef}>
                      <button
                        onClick={() => setShowPhotoMenu(!showPhotoMenu)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                          />
                        </svg>
                        Manage Photo
                      </button>

                      {showPhotoMenu && (
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => setShowPhotoMenu(false)}
                          />

                          <div className="absolute left-0 bottom-full mb-2 w-48 bg-white border border-gray-200 rounded-lg shadow-2xl z-50 overflow-hidden">
                            <button
                              onClick={handleUploadClick}
                              className="w-full px-4 py-3 text-left text-gray-900 hover:bg-gray-100 transition-colors flex items-center gap-3 text-sm"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                />
                              </svg>
                              {currentUser?.profileImage
                                ? "Change Photo"
                                : "Upload Photo"}
                            </button>

                            {currentUser?.profileImage && (
                              <button
                                onClick={handleRemoveImage}
                                className="w-full px-4 py-3 text-left text-red-600 hover:bg-red-50 transition-colors flex items-center gap-3 text-sm border-t border-gray-200"
                              >
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                  />
                                </svg>
                                Remove Profile
                              </button>
                            )}
                          </div>
                        </>
                      )}

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                    </div>
                  </div>
                </div>

                <input
                  ref={coverFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleCoverPhotoChange}
                />
              </div>
            </div>
          )}
          {/* Debug logs */}
          {console.log(" Render Check:", {
            authProvider,
            hasPassword,
            condition1: authProvider && authProvider !== "local",
            condition2: !hasPassword,
            finalCondition:
              authProvider && authProvider !== "local" && !hasPassword,
          })}
          {/* Set Password Section (Only for SSO users) */}

          {(initialView === "all" || initialView === "password") &&
            authProvider &&
            authProvider !== "local" &&
            !hasPassword && (
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <h3 className="text-gray-900 font-semibold mb-2 text-lg flex items-center gap-2">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                  Set Password
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  You signed up with{" "}
                  {authProvider === "google" ? "Google" : "Facebook"}. Set a
                  password to enable email login.
                </p>

                {passwordError && (
                  <div className="bg-red-500/20 border border-red-500 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
                    {passwordError}
                  </div>
                )}

                {passwordSuccess && (
                  <div className="bg-green-500/20 border border-green-500 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm">
                    {passwordSuccess}
                  </div>
                )}

                <form onSubmit={handleSetPassword} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter new password (min 6 characters)"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        minLength={6}
                        className="w-full p-3 pr-12 rounded-lg bg-white border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? (
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm Password
                    </label>
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
                      className="w-full p-3 rounded-lg bg-white border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={passwordLoading}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-3 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                  >
                    {passwordLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white"></div>
                        Setting Password...
                      </span>
                    ) : (
                      "Set Password"
                    )}
                  </button>
                </form>
              </div>
            )}

          {/*  CHANGE PASSWORD SECTION - Add this */}
          {(initialView === "all" || initialView === "password") &&
            hasPassword && (
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <h3 className="text-gray-900 font-semibold mb-2 text-lg flex items-center gap-2">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  Change Password
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  Update your current password
                </p>

                {changePasswordError && (
                  <div className="bg-red-500/20 border border-red-500 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
                    {changePasswordError}
                  </div>
                )}

                {changePasswordSuccess && (
                  <div className="bg-green-500/20 border border-green-500 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm">
                    {changePasswordSuccess}
                  </div>
                )}

                <form onSubmit={handleChangePassword} className="space-y-4">
                  {/* Current Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Current Password
                    </label>
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter current password"
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      required
                      className="w-full p-3 rounded-lg bg-white border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900"
                    />
                  </div>

                  {/* New Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter new password (min 6 characters)"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        minLength={6}
                        className="w-full p-3 pr-12 rounded-lg bg-white border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? (
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Confirm New Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm New Password
                    </label>
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
                      className="w-full p-3 rounded-lg bg-white border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={changePasswordLoading}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-3 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-wait shadow-lg hover:shadow-xl"
                  >
                    {changePasswordLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white"></div>
                        Changing Password...
                      </span>
                    ) : (
                      "Change Password"
                    )}
                  </button>
                </form>
              </div>
            )}
          {(initialView === "all" || initialView === "settings") && (
            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
              <h3 className="text-gray-900 font-semibold mb-4 text-lg flex items-center gap-2">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
                Notifications
              </h3>
              <div className="space-y-3">
                <label className="flex items-center justify-between p-3 bg-white rounded-lg cursor-pointer hover:bg-gray-100 transition-colors border border-gray-200">
                  <span className="text-gray-900 text-sm">
                    Message Notifications
                  </span>
                  <input
                    type="checkbox"
                    checked={notifications.messageNotifications}
                    onChange={(e) =>
                      setNotifications({
                        ...notifications,
                        messageNotifications: e.target.checked,
                      })
                    }
                    className="w-5 h-5 text-blue-600 rounded"
                  />
                </label>
                <label className="flex items-center justify-between p-3 bg-white rounded-lg cursor-pointer hover:bg-gray-100 transition-colors border border-gray-200">
                  <span className="text-gray-900 text-sm">Friend Requests</span>
                  <input
                    type="checkbox"
                    checked={notifications.friendRequests}
                    onChange={(e) =>
                      setNotifications({
                        ...notifications,
                        friendRequests: e.target.checked,
                      })
                    }
                    className="w-5 h-5 text-blue-600 rounded"
                  />
                </label>
                <label className="flex items-center justify-between p-3 bg-white rounded-lg cursor-pointer hover:bg-gray-100 transition-colors border border-gray-200">
                  <span className="text-gray-900 text-sm">Sound Enabled</span>
                  <input
                    type="checkbox"
                    checked={notifications.soundEnabled}
                    onChange={(e) =>
                      setNotifications({
                        ...notifications,
                        soundEnabled: e.target.checked,
                      })
                    }
                    className="w-5 h-5 text-blue-600 rounded"
                  />
                </label>
              </div>
            </div>
          )}
          {/* Friend Requests Section */}
          {(initialView === "all" || initialView === "settings") && (
            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
              <h3 className="text-gray-900 font-semibold mb-4 text-lg flex items-center gap-2">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                  />
                </svg>
                Friend Requests
                {pendingRequests.length > 0 && (
                  <span className="px-2 py-1 bg-yellow-600 text-white text-xs rounded-full">
                    {pendingRequests.length}
                  </span>
                )}
              </h3>

              {pendingRequests.length === 0 ? (
                <p className="text-gray-600 text-sm text-center py-4">
                  No pending requests
                </p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {pendingRequests.map((request) => (
                    <div
                      key={request._id}
                      className="bg-white rounded-lg p-3 border border-gray-200"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 rounded-full overflow-hidden">
                            {request.sender.profileImage ? (
                              <img
                                src={request.sender.profileImage}
                                alt={request.sender.username}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                                {request.sender.username
                                  .charAt(0)
                                  .toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {request.sender.username}
                            </p>
                            <p className="text-xs text-gray-600">
                              {request.sender.email}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAcceptRequest(request._id)}
                          className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition-colors"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleRejectRequest(request._id)}
                          className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-md transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {/* Blocked Users Section */}
          {(initialView === "all" || initialView === "settings") && (
            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
              <h3 className="text-gray-900 font-semibold mb-4 text-lg flex items-center gap-2">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                  />
                </svg>
                Blocked Users
                {blockedUsers.length > 0 && (
                  <span className="px-2 py-1 bg-red-600 text-white text-xs rounded-full">
                    {blockedUsers.length}
                  </span>
                )}
              </h3>

              {blockedUsers.length === 0 ? (
                <p className="text-gray-600 text-sm text-center py-4">
                  No blocked users
                </p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {blockedUsers.map((block) => (
                    <div
                      key={block._id}
                      className="bg-white rounded-lg p-3 border border-gray-200"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 rounded-full overflow-hidden">
                            {block.blocked.profileImage ? (
                              <img
                                src={block.blocked.profileImage}
                                alt={block.blocked.username}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center text-white font-bold">
                                {block.blocked.username.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {block.blocked.username}
                            </p>
                            <p className="text-xs text-gray-600">
                              {block.blocked.email}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleUnblockUser(block.blocked._id)}
                          className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition-colors"
                        >
                          Unblock
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
