import React, { useState } from "react";

import axios from "axios";
import { useAuthImage } from "../hooks/useAuthImage";
const DIALOG_THEME = {
  // Overlay (background blur)
  overlay: "bg-black bg-opacity-50 backdrop-blur-sm",

  // Dialog box - WHITE THEME
  dialogBg: "bg-white",
  border: "border border-gray-200",

  // Icon background
  iconBg: "bg-red-50",
  iconColor: "text-red-500",

  // Text colors - DARK for readability
  titleColor: "text-gray-900",
  messageColor: "text-gray-600",
  highlightColor: "text-blue-600",

  // Buttons - Modern clean style
  cancelBtn: "bg-gray-100 hover:bg-gray-200 text-gray-900",
  confirmBtn: "bg-red-600 hover:bg-red-700 text-white",

  // Animation
  animation: "transform transition-all duration-200 hover:scale-105",
};

export default function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Action",
  message = "Are you sure you want to proceed?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  highlightText = null,
  icon = "warning",
  type = "danger",
}) {
  if (!isOpen) return null;

  // Icon selection
  const renderIcon = () => {
    if (icon === "block") {
      return (
        <svg
          className="w-12 h-12"
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
      );
    } else if (icon === "delete") {
      return (
        <svg
          className="w-12 h-12"
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
      );
    } else if (icon === "success") {
      return (
        <svg
          className="w-12 h-12"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      );
    } else if (icon === "unfriend") {
      return (
        <svg
          className="w-12 h-12"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6"
          />
        </svg>
      );
    } else {
      // Default warning icon
      return (
        <svg
          className="w-12 h-12"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      );
    }
  };

  // Button color based on type
  const getConfirmButtonClass = () => {
    if (type === "success") {
      return "bg-green-600 hover:bg-green-700 text-white";
    } else if (type === "info") {
      return "bg-blue-600 hover:bg-blue-700 text-white";
    }
    return DIALOG_THEME.confirmBtn;
  };

  // Icon color based on type
  const getIconBgClass = () => {
    if (type === "success") {
      return "bg-green-50";
    } else if (type === "info") {
      return "bg-blue-50";
    }
    return DIALOG_THEME.iconBg;
  };

  const getIconColorClass = () => {
    if (type === "success") {
      return "text-green-500";
    } else if (type === "info") {
      return "text-blue-500";
    }
    return DIALOG_THEME.iconColor;
  };

  return (
    <div
      className={`fixed inset-0 ${DIALOG_THEME.overlay} flex items-center justify-center z-50`}
      onClick={onClose}
    >
      <div
        className={`${DIALOG_THEME.dialogBg} ${DIALOG_THEME.border} rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 animate-fadeIn`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div
            className={`${getIconBgClass()} ${getIconColorClass()} rounded-full p-4`}
          >
            {renderIcon()}
          </div>
        </div>

        {/* Title */}
        <h2
          className={`text-2xl font-bold ${DIALOG_THEME.titleColor} text-center mb-3`}
        >
          {title}
        </h2>

        {/* Message */}
        <p
          className={`${DIALOG_THEME.messageColor} text-center mb-8 leading-relaxed`}
        >
          {highlightText ? (
            <>
              {message.split(highlightText)[0]}
              <span className={`font-semibold ${DIALOG_THEME.highlightColor}`}>
                {highlightText}
              </span>
              {message.split(highlightText)[1]}
            </>
          ) : (
            message
          )}
        </p>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className={`flex-1 px-6 py-3 ${DIALOG_THEME.cancelBtn} rounded-lg font-medium ${DIALOG_THEME.animation}`}
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`flex-1 px-6 py-3 ${getConfirmButtonClass()} rounded-lg font-medium ${
              DIALOG_THEME.animation
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export function AlertDialog({
  isOpen,
  onClose,
  title = "Success",
  message = "Operation completed successfully!",
  buttonText = "OK",
  icon = "success",
  type = "success",
}) {
  if (!isOpen) return null;

  const renderIcon = () => {
    if (icon === "success") {
      return (
        <svg
          className="w-12 h-12"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      );
    } else if (icon === "error") {
      return (
        <svg
          className="w-12 h-12"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      );
    } else {
      return (
        <svg
          className="w-12 h-12"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      );
    }
  };

  const getIconBgClass = () => {
    if (type === "error") return "bg-red-50";
    if (type === "info") return "bg-blue-50";
    return "bg-green-50";
  };

  const getIconColorClass = () => {
    if (type === "error") return "text-red-500";
    if (type === "info") return "text-blue-500";
    return "text-green-500";
  };

  const getButtonClass = () => {
    if (type === "error") return "bg-red-600 hover:bg-red-700";
    if (type === "info") return "bg-blue-600 hover:bg-blue-700";
    return "bg-green-600 hover:bg-green-700";
  };

  return (
    <div
      className={`fixed inset-0 ${DIALOG_THEME.overlay} flex items-center justify-center z-50`}
      onClick={onClose}
    >
      <div
        className={`${DIALOG_THEME.dialogBg} ${DIALOG_THEME.border} rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 animate-fadeIn`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div
            className={`${getIconBgClass()} ${getIconColorClass()} rounded-full p-4`}
          >
            {renderIcon()}
          </div>
        </div>

        {/* Title */}
        <h2
          className={`text-2xl font-bold ${DIALOG_THEME.titleColor} text-center mb-3`}
        >
          {title}
        </h2>

        {/* Message */}
        <p
          className={`${DIALOG_THEME.messageColor} text-center mb-8 leading-relaxed`}
        >
          {message}
        </p>

        {/* Single Button */}
        <button
          onClick={onClose}
          className={`w-full px-6 py-3 ${getButtonClass()} text-white rounded-lg font-medium ${
            DIALOG_THEME.animation
          }`}
        >
          {buttonText}
        </button>
      </div>
    </div>
  );
}
function FriendListItem({ friend, isSelected, onToggle }) {
  const shouldLoadImage = !!friend.profileImage;
  const { imageSrc, loading } = useAuthImage(
    shouldLoadImage ? friend.profileImage : null,
  );

  return (
    <label className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-100 last:border-b-0">
      <input
        type="checkbox"
        checked={isSelected}
        onChange={() => onToggle(friend._id)}
        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
      />

      <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
        {shouldLoadImage && loading ? (
          <div className="w-full h-full bg-gray-300 animate-pulse" />
        ) : shouldLoadImage && imageSrc ? (
          <img
            src={imageSrc}
            alt={friend.username}
            className="w-full h-full object-cover"
            onError={(e) => {
              console.log(" Image load failed for:", friend.username);
            }}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
            {friend.username?.charAt(0)?.toUpperCase() || "U"}
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {friend.username}
        </p>
        <p className="text-xs text-gray-500 truncate">{friend.email}</p>
      </div>
    </label>
  );
}
export function CreateGroupDialog({
  friends = [],
  onClose,
  onSuccess,
  currentUserId,
}) {
  const [groupName, setGroupName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alertDialog, setAlertDialog] = useState({
    isOpen: false,
    title: "",
    message: "",
    type: "success",
  });

  const handleToggleMember = (friendId) => {
    setSelectedMembers((prev) => {
      if (prev.includes(friendId)) {
        return prev.filter((id) => id !== friendId);
      } else {
        return [...prev, friendId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedMembers.length === friends.length) {
      setSelectedMembers([]);
    } else {
      setSelectedMembers(friends.map((f) => f._id));
    }
  };

  const handleCreate = async () => {
    if (!groupName.trim()) {
      setAlertDialog({
        isOpen: true,
        title: "Error",
        message: "Please enter a group name",
        type: "error",
      });
      return;
    }

    if (selectedMembers.length === 0) {
      setAlertDialog({
        isOpen: true,
        title: "Error",
        message: "Please select at least one member",
        type: "error",
      });
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      const response = await axios.post(
        "http://localhost:5000/api/groups/create",
        {
          name: groupName.trim(),
          description: description.trim(),
          memberIds: selectedMembers,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      console.log(" Group created:", response.data);

      setAlertDialog({
        isOpen: true,
        title: "Success!",
        message: `Group "${groupName}" created successfully!`,
        type: "success",
      });

      setTimeout(() => {
        onSuccess(response.data);
        onClose();
      }, 1500);
    } catch (err) {
      console.error(" Create group error:", err);
      setAlertDialog({
        isOpen: true,
        title: "Error",
        message: err.response?.data?.message || "Failed to create group",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg
                className="w-6 h-6 text-white"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
              </svg>
              <h2 className="text-xl font-bold text-white">Create New Group</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-white/20 rounded-full transition-colors"
            >
              <svg
                className="w-6 h-6 text-white"
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

          {/* Body */}
          <div className="p-6 max-h-[70vh] overflow-y-auto">
            {/* Group Name */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Group Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Enter group name..."
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                maxLength={100}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              />
              <p className="text-xs text-gray-500 mt-1">
                {groupName.length}/100 characters
              </p>
            </div>

            {/* Description */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description (Optional)
              </label>
              <textarea
                placeholder="What's this group about?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-gray-900"
              />
              <p className="text-xs text-gray-500 mt-1">
                {description.length}/500 characters
              </p>
            </div>

            {/* Select Members */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Select Members <span className="text-red-500">*</span>
                </label>
                <button
                  onClick={handleSelectAll}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  {selectedMembers.length === friends.length
                    ? "Deselect All"
                    : "Select All"}
                </button>
              </div>

              {friends.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <svg
                    className="w-12 h-12 mx-auto mb-2 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  <p className="text-sm">No friends available</p>
                </div>
              ) : (
                <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
                  {friends.map((friend) => (
                    <FriendListItem
                      key={friend._id}
                      friend={friend}
                      isSelected={selectedMembers.includes(friend._id)}
                      onToggle={handleToggleMember}
                    />
                  ))}
                </div>
              )}

              <p className="text-xs text-gray-600 mt-2">
                {selectedMembers.length} member
                {selectedMembers.length !== 1 ? "s" : ""} selected
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg font-medium transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={
                loading || !groupName.trim() || selectedMembers.length === 0
              }
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                <>
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
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Create Group
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <AlertDialog
        isOpen={alertDialog.isOpen}
        onClose={() => setAlertDialog({ ...alertDialog, isOpen: false })}
        title={alertDialog.title}
        message={alertDialog.message}
        type={alertDialog.type}
      />
    </>
  );
}
