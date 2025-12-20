import React, { useState, useRef, useEffect } from "react";
import { useAuthImage } from "../hooks/useAuthImage";

export default function ProfileSettings({ currentUser, onClose, onProfileImageUpdate }) {
  const [showPhotoMenu, setShowPhotoMenu] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // ✅ FIX: Use only currentUser.profileImage
  const { imageSrc: profilePreview, loading: imageLoading } = useAuthImage(
    currentUser?.profileImage
  );
  
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [notifications, setNotifications] = useState({
    messageNotifications: true,
    friendRequests: true,
    soundEnabled: true,
  });

  const fileInputRef = useRef(null);
  const photoMenuRef = useRef(null);

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
        }
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
        }
      );
      const uploadData = await uploadRes.json();
      const imageUrl = uploadData.imageUrl;
      
      await fetch(
        "http://localhost:5000/api/users/profile/update-image",
        {
          method: "PUT",
          headers: { 
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ profileImage: imageUrl })
        }
      );
      
      // ✅ Notify Dashboard of the change
      onProfileImageUpdate(imageUrl);
      alert("Profile picture uploaded successfully!");
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Failed to upload profile picture");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveImage = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      await fetch(
        "http://localhost:5000/api/users/profile/remove-image",
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      // ✅ Notify Dashboard of the change
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

  const handleUnblockUser = async (userId) => {
    try {
      const token = localStorage.getItem("token");
      await fetch(
        `http://localhost:5000/api/friends/unblock/${userId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
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
        }
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
        }
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
      <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gray-900 px-6 py-4 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Profile Settings</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors text-gray-400 hover:text-white"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Profile Section */}
          <div className="bg-gray-900 rounded-lg p-6">
            <h3 className="text-white font-semibold mb-4 text-lg">Profile Picture</h3>
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-gray-700">
                  {imageLoading ? (
                    <div className="w-full h-full bg-gray-700 animate-pulse" />
                  ) : profilePreview ? (
                    <img
                      src={profilePreview}
                      alt="profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-3xl font-semibold">
                      {currentUser?.username?.charAt(0)?.toUpperCase() || "U"}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-1">
                <p className="text-white font-medium text-lg mb-1">
                  {currentUser?.username || "User"}
                </p>
                <p className="text-gray-400 text-sm mb-3">
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
                    <div className="absolute left-0 top-12 w-48 bg-gray-700 border border-gray-600 rounded-lg shadow-xl z-50 overflow-hidden">
                      <button
                        onClick={handleUploadClick}
                        className="w-full px-4 py-3 text-left text-gray-200 hover:bg-gray-600 transition-colors flex items-center gap-3 text-sm"
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
                        {currentUser?.profileImage ? "Change Photo" : "Upload Photo"}
                      </button>

                      {currentUser?.profileImage && (
                        <button
                          onClick={handleRemoveImage}
                          className="w-full px-4 py-3 text-left text-red-400 hover:bg-gray-600 transition-colors flex items-center gap-3 text-sm border-t border-gray-600"
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
                          Remove Photo
                        </button>
                      )}
                    </div>
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
          </div>

          {/* Notifications Section */}
          <div className="bg-gray-900 rounded-lg p-6">
            <h3 className="text-white font-semibold mb-4 text-lg flex items-center gap-2">
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
              <label className="flex items-center justify-between p-3 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-750 transition-colors">
                <span className="text-gray-300 text-sm">
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
              <label className="flex items-center justify-between p-3 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-750 transition-colors">
                <span className="text-gray-300 text-sm">Friend Requests</span>
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
              <label className="flex items-center justify-between p-3 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-750 transition-colors">
                <span className="text-gray-300 text-sm">Sound Enabled</span>
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

          {/* Friend Requests Section */}
          <div className="bg-gray-900 rounded-lg p-6">
            <h3 className="text-white font-semibold mb-4 text-lg flex items-center gap-2">
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
              <p className="text-gray-400 text-sm text-center py-4">
                No pending requests
              </p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {pendingRequests.map((request) => (
                  <div
                    key={request._id}
                    className="bg-gray-800 rounded-lg p-3"
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
                              {request.sender.username.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">
                            {request.sender.username}
                          </p>
                          <p className="text-xs text-gray-400">
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

          {/* Blocked Users Section */}
          <div className="bg-gray-900 rounded-lg p-6">
            <h3 className="text-white font-semibold mb-4 text-lg flex items-center gap-2">
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
              <p className="text-gray-400 text-sm text-center py-4">
                No blocked users
              </p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {blockedUsers.map((block) => (
                  <div key={block._id} className="bg-gray-800 rounded-lg p-3">
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
                          <p className="text-sm font-medium text-white">
                            {block.blocked.username}
                          </p>
                          <p className="text-xs text-gray-400">
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
        </div>
      </div>
    </div>
  );
}