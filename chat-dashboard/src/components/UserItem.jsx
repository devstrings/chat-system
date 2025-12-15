import React, { useState, useEffect, memo } from "react";
import ConfirmationDialog, { AlertDialog } from "./ConfirmationDialog";
import axios from "axios";
import { useAuthImage } from "../hooks/useAuthImage";
const UserItem = memo(function UserItem({
  user,
  selected,
  onClick,
  isOnline = false,
  unreadCount = 0,
  lastMessage = "",
  lastMessageTime = null,
  lastMessageSender = null,
  currentUserId = null,
  lastMessageStatus = "sent",
  onRelationshipChange,
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [relationshipStatus, setRelationshipStatus] = useState("loading");
  const [requestId, setRequestId] = useState(null);
  const [conversationId, setConversationId] = useState(null);
  const { imageSrc: userImage } = useAuthImage(user.profileImage);

  // Dialog states
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: "",
    message: "",
    confirmText: "",
    onConfirm: null,
    icon: "warning",
    type: "danger",
  });

  const [alertDialog, setAlertDialog] = useState({
    isOpen: false,
    title: "",
    message: "",
    type: "success",
  });

  const [showProfileDialog, setShowProfileDialog] = useState(false);

  // Fetch relationship status
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(
          `http://localhost:5000/api/friends/status/${user._id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();
        setRelationshipStatus(data.status);
        if (data.requestId) {
          setRequestId(data.requestId);
        }
      } catch (err) {
        console.error("Fetch status error:", err);
      }
    };

    if (user._id) {
      fetchStatus();
    }
  }, [user._id]);

  useEffect(() => {
    const getConversationId = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.post(
          "http://localhost:5000/api/messages/conversation",
          { otherUserId: user._id },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setConversationId(res.data._id);
      } catch (err) {
        console.error("Get conversation error:", err);
      }
    };

    if (relationshipStatus === "friends") {
      getConversationId();
    }
  }, [user._id, relationshipStatus]);

  const formatTime = (date) => {
    if (!date) return "";
    const now = new Date();
    const msgDate = new Date(date);
    const diff = now - msgDate;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "now";
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days}d`;
    return msgDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const truncateMessage = (msg, length = 30) => {
    if (!msg || msg.trim() === "") return "";
    if (msg.length <= length) return msg;
    return msg.substring(0, length) + "...";
  };

  const displayMessage = truncateMessage(lastMessage);
  const isOwnMessage =
    lastMessageSender && currentUserId && lastMessageSender === currentUserId;

  const getMessageStatusIcon = () => {
    if (!isOwnMessage || !lastMessage) return null;

    if (lastMessageStatus === "read") {
      return (
        <svg
          className="w-3 h-3 text-blue-400 flex-shrink-0 mr-1"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M0.41,13.41L6,19L7.41,17.58L1.83,12M22.24,5.58L11.66,16.17L7.5,12L6.07,13.41L11.66,19L23.66,7M18,7L16.59,5.58L10.24,11.93L11.66,13.34L18,7Z" />
        </svg>
      );
    } else if (lastMessageStatus === "delivered") {
      return (
        <svg
          className="w-3 h-3 text-gray-400 flex-shrink-0 mr-1"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M0.41,13.41L6,19L7.41,17.58L1.83,12M22.24,5.58L11.66,16.17L7.5,12L6.07,13.41L11.66,19L23.66,7M18,7L16.59,5.58L10.24,11.93L11.66,13.34L18,7Z" />
        </svg>
      );
    } else {
      return (
        <svg
          className="w-3 h-3 text-gray-400 flex-shrink-0 mr-1"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z" />
        </svg>
      );
    }
  };

  const handleSendRequest = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        "http://localhost:5000/api/friends/request/send",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ receiverId: user._id }),
        }
      );

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message);
      }

      setRelationshipStatus("request_sent");

      setAlertDialog({
        isOpen: true,
        title: "Friend Request Sent!",
        message: `Friend request sent to ${user.username}`,
        type: "success",
      });

      if (onRelationshipChange) onRelationshipChange();
    } catch (err) {
      setAlertDialog({
        isOpen: true,
        title: "Error",
        message: err.message || "Failed to send request",
        type: "error",
      });
    }
    setShowMenu(false);
  };

  const handleAcceptRequest = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `http://localhost:5000/api/friends/request/${requestId}/accept`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message);
      }

      setRelationshipStatus("friends");

      setAlertDialog({
        isOpen: true,
        title: "Friend Request Accepted!",
        message: `You are now friends with ${user.username}`,
        type: "success",
      });

      if (onRelationshipChange) onRelationshipChange();
    } catch (err) {
      setAlertDialog({
        isOpen: true,
        title: "Error",
        message: err.message || "Failed to accept request",
        type: "error",
      });
    }
    setShowMenu(false);
  };

  const handleRejectRequest = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `http://localhost:5000/api/friends/request/${requestId}/reject`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message);
      }

      setRelationshipStatus("none");

      setAlertDialog({
        isOpen: true,
        title: "Request Rejected",
        message: "Friend request rejected",
        type: "info",
      });

      if (onRelationshipChange) onRelationshipChange();
    } catch (err) {
      setAlertDialog({
        isOpen: true,
        title: "Error",
        message: err.message || "Failed to reject request",
        type: "error",
      });
    }
    setShowMenu(false);
  };

  const handleUnfriend = () => {
    setConfirmDialog({
      isOpen: true,
      title: "Unfriend User?",
      message: `Are you sure you want to unfriend ${user.username}?`,
      confirmText: "Unfriend",
      cancelText: "Cancel",
      icon: "unfriend",
      type: "danger",
      onConfirm: async () => {
        try {
          const token = localStorage.getItem("token");
          const res = await fetch(
            `http://localhost:5000/api/friends/unfriend/${user._id}`,
            {
              method: "DELETE",
              headers: { Authorization: `Bearer ${token}` },
            }
          );

          if (!res.ok) {
            const error = await res.json();
            throw new Error(error.message);
          }

          setRelationshipStatus("none");

          setAlertDialog({
            isOpen: true,
            title: "Unfriended",
            message: `You are no longer friends with ${user.username}`,
            type: "info",
          });

          if (onRelationshipChange) onRelationshipChange();
        } catch (err) {
          setAlertDialog({
            isOpen: true,
            title: "Error",
            message: err.message || "Failed to unfriend",
            type: "error",
          });
        }
      },
    });
    setShowMenu(false);
  };

  const handleBlock = () => {
    setConfirmDialog({
      isOpen: true,
      title: "Block User?",
      message: `Block ${user.username}? They won't be able to message you.`,
      confirmText: "Block",
      cancelText: "Cancel",
      highlightText: user.username,
      icon: "block",
      type: "danger",
      onConfirm: async () => {
        try {
          const token = localStorage.getItem("token");
          const res = await fetch("http://localhost:5000/api/friends/block", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ userId: user._id }),
          });

          if (!res.ok) {
            const error = await res.json();
            throw new Error(error.message);
          }

          setRelationshipStatus("blocked");

          setAlertDialog({
            isOpen: true,
            title: "User Blocked",
            message: `${user.username} has been blocked successfully`,
            type: "success",
          });

          if (onRelationshipChange) onRelationshipChange();
        } catch (err) {
          setAlertDialog({
            isOpen: true,
            title: "Error",
            message: err.message || "Failed to block user",
            type: "error",
          });
        }
      },
    });
    setShowMenu(false);
  };

  const handleUnblock = () => {
    setConfirmDialog({
      isOpen: true,
      title: "Unblock User?",
      message: `Unblock ${user.username}? They will be able to message you again.`,
      confirmText: "Unblock",
      cancelText: "Cancel",
      highlightText: user.username,
      icon: "success",
      type: "success",
      onConfirm: async () => {
        try {
          const token = localStorage.getItem("token");
          const res = await fetch(
            `http://localhost:5000/api/friends/unblock/${user._id}`,
            {
              method: "DELETE",
              headers: { Authorization: `Bearer ${token}` },
            }
          );

          if (!res.ok) {
            const error = await res.json();
            throw new Error(error.message);
          }

          setRelationshipStatus("none");

          setAlertDialog({
            isOpen: true,
            title: "User Unblocked",
            message: `${user.username} has been unblocked`,
            type: "success",
          });

          if (onRelationshipChange) onRelationshipChange();
        } catch (err) {
          setAlertDialog({
            isOpen: true,
            title: "Error",
            message: err.message || "Failed to unblock user",
            type: "error",
          });
        }
      },
    });
    setShowMenu(false);
  };

  const handleClearChat = () => {
    setConfirmDialog({
      isOpen: true,
      title: "Clear Chat?",
      message: `Clear all messages with ${user.username}? This action cannot be undone.`,
      confirmText: "Clear Chat",
      cancelText: "Cancel",
      highlightText: user.username,
      icon: "delete",
      type: "danger",
      onConfirm: async () => {
        try {
          const token = localStorage.getItem("token");
          await axios.delete(
            `http://localhost:5000/api/messages/conversation/${conversationId}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );

          setAlertDialog({
            isOpen: true,
            title: "Chat Cleared!",
            message: "All messages have been deleted successfully.",
            type: "success",
          });

          setTimeout(() => {
            window.location.reload();
          }, 1500);
        } catch (err) {
          setAlertDialog({
            isOpen: true,
            title: "Error",
            message: "Could not clear chat. Please try again.",
            type: "error",
          });
        }
      },
    });
    setShowMenu(false);
  };

  const handleShowProfile = () => {
    setShowProfileDialog(true);
  };

  const getStatusBadge = () => {
    if (relationshipStatus === "request_sent") {
      return <span className="text-xs text-yellow-400">Request Sent</span>;
    }
    if (relationshipStatus === "request_received") {
      return <span className="text-xs text-green-400">Pending Request</span>;
    }
    if (relationshipStatus === "blocked") {
      return <span className="text-xs text-red-400">Blocked</span>;
    }
    if (relationshipStatus === "blocked_by") {
      return <span className="text-xs text-gray-500">Unavailable</span>;
    }
    return null;
  };

  return (
    <>
      <div
        className={`mx-2 mb-1 px-4 py-3 cursor-pointer rounded-xl transition-all duration-200 flex items-center gap-3 relative ${
          selected
            ? "bg-gradient-to-r from-blue-600 to-blue-500 shadow-lg"
            : "hover:bg-gray-700 hover:bg-opacity-50 active:scale-95"
        }`}
        onClick={(e) => {
          if (relationshipStatus === "friends") {
            onClick();
          } else {
            e.stopPropagation();
            setAlertDialog({
              isOpen: true,
              title: "Cannot Chat",
              message: "You must be friends to chat!",
              type: "info",
            });
          }
        }}
      >
        

        {/* AVATAR WITH PROFILE PICTURE */}
        <div className="relative">
          {" "}
          
          <div
            className={`w-12 h-12 rounded-full overflow-hidden shadow-md transition-transform duration-200 cursor-pointer hover:scale-110 ${
              selected ? "ring-2 ring-white ring-opacity-40" : ""
            }`}
            onClick={(e) => {
              e.stopPropagation();
              handleShowProfile();
            }}
            title="View Profile"
          >
            {userImage ? (
              <img
                src={userImage}
                alt={user.username}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500 text-white font-semibold">
                {user.username.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          {/*  GREEN DOT FOR ONLINE STATUS */}
          {isOnline && (
            <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-gray-800 rounded-full"></div>
          )}
          {/*  UNREAD BADGE */}
          {unreadCount > 0 && (
            <div className="absolute -top-1 -right-1 min-w-5 h-5 bg-red-500 rounded-full flex items-center justify-center px-1 border-2 border-gray-800">
              <span className="text-white text-xs font-bold">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            </div>
          )}
        </div>

        {/* User info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h3
              className={`font-semibold truncate ${
                selected
                  ? "text-white"
                  : unreadCount > 0
                  ? "text-white"
                  : "text-gray-200"
              }`}
            >
              {user.username}
            </h3>
            {lastMessageTime && relationshipStatus === "friends" && (
              <span
                className={`text-xs flex-shrink-0 ml-2 ${
                  selected
                    ? "text-white text-opacity-70"
                    : unreadCount > 0
                    ? "text-blue-400 font-semibold"
                    : "text-gray-500"
                }`}
              >
                {formatTime(lastMessageTime)}
              </span>
            )}
          </div>

          {relationshipStatus === "friends" && displayMessage ? (
            <div className="flex items-center">
              {getMessageStatusIcon()}
              <p
                className={`text-xs truncate ${
                  selected
                    ? "text-white text-opacity-70"
                    : unreadCount > 0
                    ? "text-gray-200 font-medium"
                    : "text-gray-400"
                }`}
              >
                {displayMessage}
              </p>
            </div>
          ) : (
            getStatusBadge()
          )}
        </div>

        {/* Three Dots Menu */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-2 hover:bg-gray-600 hover:bg-opacity-50 rounded-lg transition-colors"
          >
            <svg
              className="w-5 h-5 text-gray-400"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
            </svg>
          </button>

          {/* Dropdown Menu */}
          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              ></div>

              <div className="absolute right-0 mt-1 w-52 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-20 overflow-hidden">
                <button
                  onClick={handleShowProfile}
                  className="w-full px-4 py-2.5 text-left text-gray-200 hover:bg-gray-700 transition-colors flex items-center gap-2 text-sm"
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
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                  View Profile
                </button>

                {relationshipStatus === "none" && (
                  <button
                    onClick={handleSendRequest}
                    className="w-full px-4 py-2.5 text-left text-blue-400 hover:bg-gray-700 transition-colors flex items-center gap-2 text-sm border-t border-gray-700"
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
                        d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                      />
                    </svg>
                    Send Friend Request
                  </button>
                )}

                {relationshipStatus === "request_received" && (
                  <>
                    <button
                      onClick={handleAcceptRequest}
                      className="w-full px-4 py-2.5 text-left text-green-400 hover:bg-gray-700 transition-colors flex items-center gap-2 text-sm border-t border-gray-700"
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
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      Accept Request
                    </button>
                    <button
                      onClick={handleRejectRequest}
                      className="w-full px-4 py-2.5 text-left text-red-400 hover:bg-gray-700 transition-colors flex items-center gap-2 text-sm border-t border-gray-700"
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
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                      Reject Request
                    </button>
                  </>
                )}

                {relationshipStatus === "friends" && (
                  <>
                    <button
                      onClick={handleClearChat}
                      className="w-full px-4 py-2.5 text-left text-orange-400 hover:bg-gray-700 transition-colors flex items-center gap-2 text-sm border-t border-gray-700"
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
                      Clear Chat
                    </button>

                    <button
                      onClick={handleUnfriend}
                      className="w-full px-4 py-2.5 text-left text-yellow-400 hover:bg-gray-700 transition-colors flex items-center gap-2 text-sm border-t border-gray-700"
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
                          d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6"
                        />
                      </svg>
                      Unfriend
                    </button>
                  </>
                )}

                {relationshipStatus !== "blocked" &&
                  relationshipStatus !== "blocked_by" && (
                    <button
                      onClick={handleBlock}
                      className="w-full px-4 py-2.5 text-left text-red-400 hover:bg-gray-700 transition-colors flex items-center gap-2 text-sm border-t border-gray-700"
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
                          d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                        />
                      </svg>
                      Block User
                    </button>
                  )}

                {relationshipStatus === "blocked" && (
                  <button
                    onClick={handleUnblock}
                    className="w-full px-4 py-2.5 text-left text-green-400 hover:bg-gray-700 transition-colors flex items-center gap-2 text-sm border-t border-gray-700"
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
                        d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"
                      />
                    </svg>
                    Unblock User
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {selected && relationshipStatus === "friends" && (
          <svg
            className="w-5 h-5 text-white text-opacity-70 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        )}
      </div>

      {/* PROFILE DIALOG */}
      {showProfileDialog && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-50"
            onClick={() => setShowProfileDialog(false)}
          ></div>

          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 max-w-sm w-full shadow-2xl">
              <div className="flex justify-end mb-4">
                <button
                  onClick={() => setShowProfileDialog(false)}
                  className="text-gray-400 hover:text-white transition-colors"
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

              {/* Profile Picture */}
              <div className="w-24 h-24 mx-auto mb-4 rounded-full overflow-hidden shadow-lg">
                {userImage ? (
                  <img
                    src={userImage}
                    alt={user.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500 text-white text-4xl font-bold">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Username */}
              <h2 className="text-2xl font-bold text-center text-white mb-2">
                {user.username}
              </h2>

              {/* Status Badge */}
              <div className="text-center mb-4">
                {user.status && (
                  <p className="text-sm text-gray-400 italic">
                    "{user.status}"
                  </p>
                )}
              </div>

              {/* Online Status */}
              <div className="flex items-center justify-center gap-2 mb-6">
                <div
                  className={`w-3 h-3 rounded-full ${
                    isOnline ? "bg-green-500" : "bg-gray-500"
                  }`}
                ></div>
                <span className="text-sm text-gray-400">
                  {isOnline ? "Online" : "Offline"}
                </span>
              </div>

              {/* Relationship Status Badge */}
              <div className="text-center mb-4">
                {relationshipStatus === "friends" && (
                  <span className="px-4 py-2 bg-blue-600 text-white text-sm rounded-full">
                    Friends
                  </span>
                )}
                {relationshipStatus === "request_sent" && (
                  <span className="px-4 py-2 bg-yellow-600 text-white text-sm rounded-full">
                    Request Sent
                  </span>
                )}
                {relationshipStatus === "request_received" && (
                  <span className="px-4 py-2 bg-green-600 text-white text-sm rounded-full">
                    Pending Request
                  </span>
                )}
                {relationshipStatus === "blocked" && (
                  <span className="px-4 py-2 bg-red-600 text-white text-sm rounded-full">
                    Blocked
                  </span>
                )}
              </div>
            </div>
          </div>
        </>
      )}
      {/* DIALOGS */}
      <ConfirmationDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        cancelText={confirmDialog.cancelText || "Cancel"}
        highlightText={confirmDialog.highlightText}
        icon={confirmDialog.icon}
        type={confirmDialog.type}
      />

      <AlertDialog
        isOpen={alertDialog.isOpen}
        onClose={() => setAlertDialog({ ...alertDialog, isOpen: false })}
        title={alertDialog.title}
        message={alertDialog.message}
        type={alertDialog.type}
      />
    </>
  );
});

export default UserItem;
