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
  isPinned = false,
  isArchived = false,
  conversationId,
  onPinConversation = () => {},
  onArchiveConversation = () => {},
  onConversationDeleted = () => {},
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [relationshipStatus, setRelationshipStatus] = useState("loading");
  const [requestId, setRequestId] = useState(null);
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

  const handleArchiveClick = (e) => {
    e.stopPropagation();
    if (conversationId) {
      onArchiveConversation(conversationId, isArchived);
    }
    setShowMenu(false);
  };

  const handlePinClick = (e) => {
    e.stopPropagation();
    if (conversationId) {
      onPinConversation(conversationId, isPinned);
    }
    setShowMenu(false);
  };

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
            `http://localhost:5000/api/messages/conversation/${conversationId}/clear`,
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



  const handleDeleteConversation = async () => {
    // First try to get/create conversation to get its ID
    let convId = conversationId;

    if (!convId) {
      //  Fetch conversation ID from backend
      try {
        const token = localStorage.getItem("token");
        const response = await axios.post(
          "http://localhost:5000/api/messages/conversation",
          { otherUserId: user._id },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        convId = response.data._id;
      } catch (err) {
        setAlertDialog({
          isOpen: true,
          title: "Error",
          message: "No conversation found to delete.",
          type: "error",
        });
        return;
      }
    }

    setConfirmDialog({
      isOpen: true,
      title: "Delete Conversation?",
      message: `Delete entire conversation with ${user.username}? This will permanently remove the conversation from your chat list. You can start a new chat by searching for them again.`,
      confirmText: "Delete Conversation",
      cancelText: "Cancel",
      highlightText: user.username,
      icon: "delete",
      type: "danger",
      onConfirm: async () => {
        try {
          const token = localStorage.getItem("token");

          console.log(" Deleting conversation:", convId);

          await axios.delete(
            `http://localhost:5000/api/messages/conversation/${convId}/delete`,
            {
              headers: { Authorization: `Bearer ${token}` },
              data: { otherUserId: user._id }, 
            }
          );

          setAlertDialog({
            isOpen: true,
            title: "Conversation Deleted!",
            message: "The conversation has been permanently deleted.",
            type: "success",
          });

         
          if (onConversationDeleted) {
            onConversationDeleted(user._id);
          }


        } catch (err) {
          console.error("❌ Delete conversation error:", err);
          setAlertDialog({
            isOpen: true,
            title: "Error",
            message:
              err.response?.data?.message ||
              "Could not delete conversation. Please try again.",
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
            ? "bg-gradient-to-r from-[#2563EB] to-[#9333EA] shadow-lg"
            : "hover:bg-[#DBEAFE] hover:bg-opacity-50 active:scale-95"
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
          {/* GREEN DOT FOR ONLINE STATUS */}
          {isOnline && (
            <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-gray-800 rounded-full"></div>
          )}
          {/* UNREAD BADGE */}
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
            {/* Left side: username + pin icon */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <h3
                className={`font-semibold truncate ${
                  selected
                    ? "text-white"
                    : unreadCount > 0
                    ? "text-white"
                    : "text-gray-900"
                }`}
              >
                {user.username}
              </h3>

              {/* Pin icon */}
              {isPinned && (
                <svg
                  className="w-3.5 h-3.5 text-blue-400 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  title="Pinned"
                >
                  <path d="M16,12V4H17V2H7V4H8V12L6,14V16H11.2V22H12.8V16H18V14L16,12Z" />
                </svg>
              )}
            </div>

            {/* Right side: timestamp */}
            {lastMessageTime && relationshipStatus === "friends" && (
              <span
                className={`text-xs flex-shrink-0 ml-2 ${
                  selected
                    ? "text-white text-opacity-90"
                    : unreadCount > 0
                    ? "text-blue-600 font-bold"
                    : "text-gray-700"
                }`}
              >
                {formatTime(lastMessageTime)}
              </span>
            )}
          </div>

          {/* Message preview below username row */}
          {relationshipStatus === "friends" && displayMessage ? (
            <div className="flex items-center">
              {getMessageStatusIcon()}
              <p
                className={`text-xs truncate ${
                  selected
                    ? "text-white text-opacity-90"
                    : unreadCount > 0
                    ? "text-gray-900 font-semibold"
                    : "text-gray-600"
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
        <div className="relative flex-shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <svg
              className="w-5 h-5 text-gray-700"
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

              <div className="absolute right-0 mt-1 w-52 bg-white border border-gray-300 rounded-lg shadow-xl z-20 overflow-hidden">
                {relationshipStatus === "friends" && conversationId && (
                  <button
                    onClick={(e) => {
                      
                      e.stopPropagation();
                      handlePinClick(e);
                    }}
                    className="w-full px-4 py-2.5 text-left text-gray-900 hover:bg-gray-100 transition-colors flex items-center gap-2 text-sm"
                  >
                    <svg
                      className="w-4 h-4 text-blue-600"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M16,12V4H17V2H7V4H8V12L6,14V16H11.2V22H12.8V16H18V14L16,12Z" />
                    </svg>
                    {isPinned ? "Unpin Chat" : "Pin Chat"}
                  </button>
                )}

                {relationshipStatus === "friends" && conversationId && (
                  <button
                    onClick={(e) => {
                      
                      e.stopPropagation();
                      handleArchiveClick(e);
                    }}
                    className="w-full px-4 py-2.5 text-left text-gray-900 hover:bg-gray-100 transition-colors flex items-center gap-2 text-sm border-t border-gray-300"
                  >
                    <svg
                      className="w-4 h-4 text-purple-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                      />
                    </svg>
                    {isArchived ? "Unarchive Chat" : "Archive Chat"}
                  </button>
                )}

                <button
                  onClick={(e) => {
                    
                    e.stopPropagation();
                    handleShowProfile();
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2.5 text-left text-gray-900 hover:bg-gray-100 transition-colors flex items-center gap-2 text-sm border-t border-gray-300"
                >
                  <svg
                    className="w-4 h-4 text-green-600"
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
                    onClick={(e) => {
                      
                      e.stopPropagation();
                      handleSendRequest();
                    }}
                    className="w-full px-4 py-2.5 text-left text-blue-600 hover:bg-blue-50 transition-colors flex items-center gap-2 text-sm border-t border-gray-300"
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
                      onClick={(e) => {
                      
                        e.stopPropagation();
                        handleAcceptRequest();
                      }}
                      className="w-full px-4 py-2.5 text-left text-green-600 hover:bg-green-50 transition-colors flex items-center gap-2 text-sm border-t border-gray-300"
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
                      onClick={(e) => {
                      
                        e.stopPropagation();
                        handleRejectRequest();
                      }}
                      className="w-full px-4 py-2.5 text-left text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2 text-sm border-t border-gray-300"
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
                      onClick={(e) => {
                        
                        e.stopPropagation();
                        handleClearChat();
                      }}
                      className="w-full px-4 py-2.5 text-left text-orange-600 hover:bg-orange-50 transition-colors flex items-center gap-2 text-sm border-t border-gray-300"
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
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteConversation();
                      }}
                      className="w-full px-4 py-2.5 text-left text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2 text-sm border-t border-gray-300 font-semibold"
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
                      Delete Conversation
                    </button>

                    <button
                      onClick={(e) => {
                  
                        e.stopPropagation();
                        handleUnfriend();
                      }}
                      className="w-full px-4 py-2.5 text-left text-yellow-600 hover:bg-yellow-50 transition-colors flex items-center gap-2 text-sm border-t border-gray-300"
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
                      onClick={(e) => {
                      
                        e.stopPropagation();
                        handleBlock();
                      }}
                      className="w-full px-4 py-2.5 text-left text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2 text-sm border-t border-gray-300"
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
                    onClick={(e) => {
                    
                      e.stopPropagation();
                      handleUnblock();
                    }}
                    className="w-full px-4 py-2.5 text-left text-green-600 hover:bg-green-50 transition-colors flex items-center gap-2 text-sm border-t border-gray-300"
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

      {/* MODERN PROFILE DIALOG */}
      {showProfileDialog && (
        <>
          {/* Backdrop with blur */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in duration-200"
            onClick={() => setShowProfileDialog(false)}
          ></div>

          {/* Profile Card */}
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4 animate-in zoom-in fade-in duration-300">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl relative overflow-hidden">
              {/* Gradient Background Header */}
              <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 -z-10"></div>

              {/* Close Button */}
              <button
                onClick={() => setShowProfileDialog(false)}
                className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-full transition-all z-10"
              >
                <svg
                  className="w-5 h-5 text-white"
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

              {/* Profile Picture with Ring */}
              <div className="relative w-28 h-28 mx-auto mb-4 mt-8">
                {/* Animated gradient ring */}
                <div
                  className="absolute inset-0 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 rounded-full animate-spin"
                  style={{ animationDuration: "3s" }}
                ></div>

                {/* White ring inside */}
                <div className="absolute inset-1 bg-white rounded-full"></div>

                {/* Profile image */}
                <div className="absolute inset-2 rounded-full overflow-hidden shadow-xl">
                  {userImage ? (
                    <img
                      src={userImage}
                      alt={user.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500 via-pink-500 to-red-500 text-white text-4xl font-bold">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Online/Offline Badge */}
                {isOnline ? (
                  <div className="absolute bottom-0 right-0 flex items-center gap-1.5 bg-green-500 px-3 py-1.5 rounded-full shadow-lg border-2 border-white">
                    <div className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-300 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                    </div>
                    <span className="text-white text-xs font-bold">Online</span>
                  </div>
                ) : (
                  <div className="absolute bottom-0 right-0 flex items-center gap-1.5 bg-gray-500 px-3 py-1.5 rounded-full shadow-lg border-2 border-white">
                    <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                    <span className="text-white text-xs font-semibold">
                      Offline
                    </span>
                  </div>
                )}
              </div>

              {/* Username with gradient */}
              <h2 className="text-3xl font-bold text-center mb-2 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                {user.username}
              </h2>

              {/* Email */}
              <div className="flex items-center justify-center gap-2 mb-6">
                <svg
                  className="w-4 h-4 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                <p className="text-sm text-gray-600">{user.email}</p>
              </div>

              {/* Relationship Status Badge */}
              <div className="flex justify-center mb-6">
                {relationshipStatus === "friends" && (
                  <div className="px-6 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-sm rounded-full font-semibold shadow-lg flex items-center gap-2">
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
                    Friends
                  </div>
                )}
                {relationshipStatus === "request_sent" && (
                  <div className="px-6 py-2.5 bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-sm rounded-full font-semibold shadow-lg flex items-center gap-2">
                    <svg
                      className="w-4 h-4 animate-pulse"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    Request Sent
                  </div>
                )}
                {relationshipStatus === "request_received" && (
                  <div className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-sm rounded-full font-semibold shadow-lg flex items-center gap-2 animate-pulse">
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
                        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                      />
                    </svg>
                    Pending Request
                  </div>
                )}
                {relationshipStatus === "blocked" && (
                  <div className="px-6 py-2.5 bg-gradient-to-r from-red-500 to-rose-500 text-white text-sm rounded-full font-semibold shadow-lg flex items-center gap-2">
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
                    Blocked
                  </div>
                )}
                {relationshipStatus === "none" && (
                  <div className="px-6 py-2.5 bg-gradient-to-r from-gray-400 to-gray-500 text-white text-sm rounded-full font-semibold shadow-lg flex items-center gap-2">
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
                    Not Connected
                  </div>
                )}
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600 mb-1">
                    {isOnline ? "Active" : "Away"}
                  </div>
                  <div className="text-xs text-gray-600 font-medium uppercase tracking-wide">
                    Status
                  </div>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-purple-600 mb-1">
                    {relationshipStatus === "friends" ? "Yes" : "No"}
                  </div>
                  <div className="text-xs text-gray-600 font-medium uppercase tracking-wide">
                    Connected
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                {/* Message Button (only for friends) */}
                {relationshipStatus === "friends" && (
                  <button
                    onClick={() => {
                      setShowProfileDialog(false);
                      onClick(); 
                    }}
                    className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center gap-2"
                  >
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
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      />
                    </svg>
                    Send Message
                  </button>
                )}

                {/* Close Button */}
                <button
                  onClick={() => setShowProfileDialog(false)}
                  className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-all"
                >
                  Close Profile
                </button>
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
