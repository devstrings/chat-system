import React, { useState, useMemo, useEffect, useRef } from "react";
import UserItem from "./UserItem";
import GroupItem from "./Group/GroupItem";
import axiosInstance from "../utils/axiosInstance";
import { AlertDialog } from "./ConfirmationDialog";
import { useAuthImage } from "../hooks/useAuthImage";
import API_BASE_URL from "../config/api";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchPendingRequests,
  fetchBlockedUsers,
  acceptFriendRequest,
  rejectFriendRequest,
  unblockUser,
} from "../store/slices/userSlice";
import {
  CreateGroupDialog,
  BlockedUsersModal,
  FriendRequestsModal,
  NotificationModal,
  AddFriendModal,
} from "./ConfirmationDialog";

import StatusRingsList from "./Status/StatusRingsList";
export default function Sidebar({
  selectedUserId,
  onSelectUser,
  currentUsername = "",
  currentUserId = "",
  onLogout,
  isMobileSidebarOpen = false,
  profileImageUrl,
  onCloseMobileSidebar = () => {},
  onOpenProfileSettings = (view = "all") => {},
  pinnedConversations = new Set(),
  onPinConversation = () => {},
  archivedConversations = new Set(),
  onArchiveConversation = () => {},
  showArchived = false,
  onToggleArchived = () => {},
  onGroupUpdate = () => {},
  onConversationDeleted = () => {},
  onOpenStatusManager = () => {},
  allStatuses = [],
  onOpenStatusViewer = () => {},
  onViewMyStatus = () => {},
  currentUserForStatus = null,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [searchUsers, setSearchUsers] = useState("");
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const socket = useSelector((state) => state.socket.socket);
  const connected = useSelector((state) => state.socket.connected);
  const onlineUsers = useSelector((state) => state.socket.onlineUsers);
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);
  const [showRequests, setShowRequests] = useState(false);
  const dispatch = useDispatch();
  const { pendingRequests, blockedUsers } = useSelector((state) => state.user);
  const [showBlocked, setShowBlocked] = useState(false);
  const [showBlockedModal, setShowBlockedModal] = useState(false);

  const [showRequestsModal, setShowRequestsModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [activeTab, setActiveTab] = useState("chats");
  const { currentUser } = useSelector((state) => state.auth);
  const { imageSrc: profilePreview, loading: imageLoading } = useAuthImage(
    currentUser?.profileImage,
  );

  const profileMenuRef = useRef(null);
  const fileInputRef = useRef(null);
  const { friends: users } = useSelector((state) => state.user);
  const { groups } = useSelector((state) => state.group);
  const { unreadCounts, lastMessages } = useSelector((state) => state.chat);

  //  Debug logs
  console.log(" Sidebar Redux Data:", {
    usersCount: users?.length || 0,
    groupsCount: groups?.length || 0,
    lastMessagesCount: Object.keys(lastMessages || {}).length,
    unreadCountsCount: Object.keys(unreadCounts || {}).length,
  });
  function ProfileImageWithAuth({
    imageUrl,
    username,
    size = "w-8 h-8",
    textSize = "text-sm",
  }) {
    const { imageSrc, loading } = useAuthImage(imageUrl);

    return (
      <div className={`${size} rounded-full overflow-hidden`}>
        {loading ? (
          <div className="w-full h-full bg-gray-300 animate-pulse" />
        ) : imageSrc ? (
          <img
            src={imageSrc}
            alt={username}
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className={`w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white ${textSize} font-bold`}
          >
            {username?.charAt(0)?.toUpperCase() || "U"}
          </div>
        )}
      </div>
    );
  }
  const [alertDialog, setAlertDialog] = useState({
    isOpen: false,
    title: "",
    message: "",
    type: "success",
  });

  const formatTime = (date) => {
    if (!date) return "";

    const d = new Date(date);
    if (isNaN(d.getTime())) return "";

    return d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const memoizedItems = useMemo(() => {
    // If searching, show ALL friends matching search
    if (searchQuery.trim()) {
      // Search in ALL friends, not just those with conversations
      const allFilteredUsers = users
        .filter(
          (user) =>
            user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.email.toLowerCase().includes(searchQuery.toLowerCase()),
        )
        .map((user) => ({ ...user, isGroup: false }));

      const filteredGroups = groups
        .filter((group) => {
          const matchesSearch = group.name
            .toLowerCase()
            .includes(searchQuery.toLowerCase());

          const isArchived = group.archivedBy?.some(
            (a) => a.userId === currentUserId,
          );

          if (showArchived) {
            return matchesSearch && isArchived;
          } else {
            return matchesSearch && !isArchived;
          }
        })
        .map((group) => ({ ...group, isGroup: true }));

      // Combine and sort by last message time
      const allItems = [...filteredGroups, ...allFilteredUsers];

      return allItems.sort((a, b) => {
        const timeA = lastMessages[a._id]?.time
          ? new Date(lastMessages[a._id].time).getTime()
          : 0;
        const timeB = lastMessages[b._id]?.time
          ? new Date(lastMessages[b._id].time).getTime()
          : 0;
        return timeB - timeA;
      });
    }

    // Show users WITH conversations (even if empty after clear)
    const filteredUsers = users
      .filter((user) => {
        const lastMsg = lastMessages[user._id];
        const convId = lastMsg?.conversationId;

        //  Show if has conversationId (even if no messages)
        if (!convId) return false;

        const isArchived = archivedConversations.has(convId);

        if (showArchived) {
          return isArchived;
        } else {
          return !isArchived;
        }
      })
      .map((user) => ({ ...user, isGroup: false }));

    const filteredGroups = groups
      .filter((group) => {
        const isArchived = group.archivedBy?.some(
          (a) => a.userId === currentUserId,
        );

        if (showArchived) {
          return isArchived;
        } else {
          return !isArchived;
        }
      })
      .map((group) => ({ ...group, isGroup: true }));

    const allItems = [...filteredGroups, ...filteredUsers];

    return allItems.sort((a, b) => {
      if (!showArchived) {
        let convIdA, convIdB, aPinned, bPinned;

        if (a.isGroup) {
          convIdA = a._id;
          aPinned = a.pinnedBy?.some((p) => p.userId === currentUserId);
        } else {
          convIdA = lastMessages[a._id]?.conversationId;
          aPinned = convIdA && pinnedConversations.has(convIdA);
        }

        if (b.isGroup) {
          convIdB = b._id;
          bPinned = b.pinnedBy?.some((p) => p.userId === currentUserId);
        } else {
          convIdB = lastMessages[b._id]?.conversationId;
          bPinned = convIdB && pinnedConversations.has(convIdB);
        }

        if (aPinned && !bPinned) return -1;
        if (!aPinned && bPinned) return 1;
      }

      // Try multiple sources for timestamp
      const getTimestamp = (item) => {
        const lastMsg = lastMessages[item._id];

        // Priority 1: _updated timestamp (most reliable)
        if (lastMsg?._updated) return lastMsg._updated;

        // Priority 2: message createdAt time
        if (lastMsg?.time) return new Date(lastMsg.time).getTime();

        // Priority 3: Group/Conversation updatedAt
        if (item.updatedAt) return new Date(item.updatedAt).getTime();

        // Fallback: 0 (push to bottom)
        return 0;
      };

      const timestampA = getTimestamp(a);
      const timestampB = getTimestamp(b);

      return timestampB - timestampA; // Latest first
    });
  }, [
    users,
    groups,
    searchQuery,
    lastMessages,
    pinnedConversations,
    archivedConversations,
    showArchived,
    currentUserId,
  ]);

  const onlineCount = memoizedItems.filter(
    (item) => !item.isGroup && onlineUsers.includes(item._id),
  ).length;

  const totalUnread = Object.values(unreadCounts).reduce(
    (sum, count) => sum + count,
    0,
  );

  const archivedCount = users.filter((user) => {
    const convId = lastMessages[user._id]?.conversationId;
    return convId && archivedConversations.has(convId);
  }).length;

  const formatLastMessageText = (message) => {
    if (!message) return "";

    if (message.attachments && message.attachments.length > 0) {
      const attachment = message.attachments[0];

      //  Priority 1: Check isVoiceMessage flag
      if (attachment.isVoiceMessage) {
        const duration = attachment.duration || 0;
        if (duration > 0) {
          const mins = Math.floor(duration / 60);
          const secs = Math.floor(duration % 60);
          return `🎤 Voice (${mins}:${secs.toString().padStart(2, "0")})`;
        }
        return "🎤 Voice message";
      }

      // Priority 2: Check fileType
      const fileType = attachment.fileType || attachment.type || "";

      if (fileType.startsWith("image/")) return "📷 Photo";
      if (fileType.startsWith("video/")) return "🎥 Video";
      if (fileType === "application/pdf") return "📕 PDF";
      if (fileType.startsWith("audio/")) return "🎵 Audio";
      if (fileType.includes("word")) return "📄 Document";
      if (fileType === "text/plain") return "📝 Text file";

      return "📎 File";
    }

    return message.text || message.content || "";
  };

  const handleSearchUsers = async () => {
    if (!searchUsers.trim()) return;
    setLoading(true);
    try {
      const token = localStorage.getItem("accessToken");
      const res = await axiosInstance.get(
        `${API_BASE_URL}/api/users/search?q=${encodeURIComponent(searchUsers)}`,
      );
      setAllUsers(res.data);
    } catch (err) {
      console.error("Search error:", err);
      setAlertDialog({
        isOpen: true,
        title: "Search Failed",
        message: "Failed to search users. Please try again.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = async (userId) => {
    try {
      const token = localStorage.getItem("accessToken");

      await axiosInstance.post(`${API_BASE_URL}/api/friends/request/send`, {
        receiverId: userId,
      });

      //  Success alert
      setAlertDialog({
        isOpen: true,
        title: "Friend Request Sent!",
        message: "Your friend request has been sent successfully.",
        type: "success",
      });

      //  Remove user from list
      setAllUsers(allUsers.filter((u) => u._id !== userId));
      //  AUTO-CLOSE modal after 1 seconds
      setTimeout(() => {
        setShowAddFriendModal(false);
        setSearchUsers("");
        setAllUsers([]);
      }, 1000);
    } catch (err) {
      //  Show proper error message
      const errorMessage =
        err.response?.data?.message || "Failed to send request";

      setAlertDialog({
        isOpen: true,
        title: "Cannot Send Request",
        message: errorMessage,
        type: "error",
      });
    }
  };

  const loadPendingRequests = async () => {
    try {
      await dispatch(fetchPendingRequests()).unwrap();
      setShowRequestsModal(true);
    } catch (err) {
      console.error("Load requests error:", err);
    }
  };

  const handleAcceptRequest = async (requestId) => {
    try {
      await dispatch(acceptFriendRequest(requestId)).unwrap();
      setAlertDialog({
        isOpen: true,
        title: "Friend Request Accepted!",
        message: "You are now friends with this user.",
        type: "success",
      });
      setTimeout(() => {
        setShowRequestsModal(false);
        window.location.reload();
      }, 1000);
    } catch (err) {
      setAlertDialog({
        isOpen: true,
        title: "Error",
        message: err || "Failed to accept request",
        type: "error",
      });
    }
  };

  const handleRejectRequest = async (requestId) => {
    try {
      await dispatch(rejectFriendRequest(requestId)).unwrap();
      setAlertDialog({
        isOpen: true,
        title: "Request Rejected",
        message: "Friend request has been rejected.",
        type: "info",
      });
      setTimeout(() => {
        setShowRequestsModal(false);
      }, 1000);
    } catch (err) {
      setAlertDialog({
        isOpen: true,
        title: "Error",
        message: err || "Failed to reject request",
        type: "error",
      });
    }
  };

  const loadBlockedUsers = async () => {
    try {
      await dispatch(fetchBlockedUsers()).unwrap();
      setShowBlockedModal(true);
    } catch (err) {
      console.error("Load blocked users error:", err);
    }
  };

  const handleUnblockUser = async (userId) => {
    try {
      await dispatch(unblockUser(userId)).unwrap();
      setAlertDialog({
        isOpen: true,
        title: "User Unblocked!",
        message: "User has been unblocked successfully.",
        type: "success",
      });

      const remainingBlocked = blockedUsers.filter(
        (b) => b.blocked._id !== userId,
      );
      if (remainingBlocked.length === 0) {
        setTimeout(() => {
          setShowBlockedModal(false);
        }, 1000);
      }
    } catch (err) {
      setAlertDialog({
        isOpen: true,
        title: "Error",
        message: err || "Failed to unblock user",
        type: "error",
      });
    }
  };

  const handleProfileClick = () => {
    onOpenProfileSettings();
  };
  const handleViewMyStatus = () => {
    onViewMyStatus();
  };

  return (
    <>
      <div
        className={`fixed md:relative inset-y-0 left-0 z-50 w-[85vw] sm:w-80 md:w-96 h-screen bg-white border-r border-gray-200 shadow-lg flex flex-col transform transition-transform duration-300 ease-in-out ${
          isMobileSidebarOpen
            ? "translate-x-0"
            : "-translate-x-full md:translate-x-0"
        }`}
      >
        <button
          onClick={onCloseMobileSidebar}
          className="md:hidden absolute top-1 right-1 p-1 text-white hover:text-gray-300 z-[70] bg-black/30 rounded-full backdrop-blur-sm"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
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

        <div className="bg-gradient-to-r from-[#2563EB] to-[#9333EA] p-3">
          {/* Top row: Profile + Username + Three Dots */}
          <div className="flex items-center justify-between mb-2 gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
              <div className="relative flex-shrink-0">
                <div
                  className="relative w-9 h-9 rounded-full overflow-hidden cursor-pointer hover:opacity-90 transition-opacity border-2 border-white/30"
                  onClick={handleProfileClick}
                >
                  {imageLoading ? (
                    <div className="w-full h-full bg-gray-700 animate-pulse" />
                  ) : profilePreview ? (
                    <img
                      src={profilePreview}
                      alt="profile"
                      className="w-full h-full object-cover"
                      crossOrigin="anonymous"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold">
                      {currentUsername?.charAt(0)?.toUpperCase() || "U"}
                    </div>
                  )}
                </div>
              </div>
              <h2 className="text-white font-semibold text-sm md:text-base truncate flex-1 min-w-0 max-w-[120px] sm:max-w-none">
                {currentUsername}
              </h2>
            </div>

            {/* Three dots menu */}
            <div className="relative flex-shrink-0 ml-auto">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowProfileMenu(!showProfileMenu);
                }}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white flex items-center justify-center"
                title="Settings & More"
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
                    d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                  />
                </svg>
              </button>

              {showProfileMenu && (
                <>
                  {/*  Full-screen backdrop */}
                  <div
                    className="fixed inset-0 z-[90] bg-black/20"
                    onClick={() => setShowProfileMenu(false)}
                    style={{
                      position: "fixed",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                    }}
                  />
                  {/*  Dropdown menu */}
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-gray-300 rounded-lg shadow-2xl z-[91] overflow-hidden">
                    <button
                      onClick={() => {
                        onOpenProfileSettings("settings");
                        setShowProfileMenu(false);
                      }}
                      className="w-full px-4 py-3 text-left text-gray-900 hover:bg-gray-100 transition-colors flex items-center gap-3 text-sm"
                    >
                      <svg
                        className="w-5 h-5 text-blue-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      <span className="font-medium">Settings</span>
                    </button>

                    <button
                      onClick={() => {
                        onOpenProfileSettings("password");
                        setShowProfileMenu(false);
                        setTimeout(() => {
                          const passwordSection = document.querySelector(
                            '[data-section="password"]',
                          );
                          if (passwordSection) {
                            passwordSection.scrollIntoView({
                              behavior: "smooth",
                              block: "start",
                            });
                          }
                        }, 300);
                      }}
                      className="w-full px-4 py-3 text-left text-gray-900 hover:bg-gray-100 transition-colors flex items-center gap-3 text-sm border-t border-gray-200"
                    >
                      <svg
                        className="w-5 h-5 text-purple-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                        />
                      </svg>
                      <span className="font-medium">Change Password</span>
                    </button>

                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        onLogout();
                      }}
                      className="w-full px-4 py-3 text-left text-red-600 hover:bg-red-50 transition-colors flex items-center gap-3 text-sm border-t border-gray-200"
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
                          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                        />
                      </svg>
                      <span className="font-medium">Logout</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Second row: Action buttons */}
          <div className="flex items-center justify-between gap-0.5 mb-2 px-0">
            <button
              onClick={() => onToggleArchived(!showArchived)}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white relative flex-shrink-0"
              title={showArchived ? "Back to Chats" : "Archived Chats"}
            >
              {showArchived ? (
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
              ) : (
                <svg
                  className="w-3.5 h-3.5"
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
              )}
              {!showArchived && archivedCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-blue-600 rounded-full text-white text-[10px] flex items-center justify-center font-semibold">
                  {archivedCount}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                loadBlockedUsers();
                setShowBlockedModal(true);
              }}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white relative flex-shrink-0"
              title="Blocked Users"
            >
              <svg
                className="w-3.5 h-3.5"
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
              {blockedUsers.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-gray-600 rounded-full text-white text-[10px] flex items-center justify-center font-semibold">
                  {blockedUsers.length}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                loadPendingRequests();
                setShowRequestsModal(true);
              }}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors text-yellow-400 hover:text-yellow-300 relative flex-shrink-0"
              title="Friend Requests"
            >
              <svg
                className="w-3.5 h-3.5"
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
              {pendingRequests.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-red-500 rounded-full text-white text-[10px] flex items-center justify-center font-semibold">
                  {pendingRequests.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setShowAddFriendModal(true)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors text-blue-400 hover:text-blue-300 flex-shrink-0"
              title="Add Friend"
            >
              <svg
                className="w-3.5 h-3.5"
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
            </button>

            <button
              onClick={() => setShowCreateGroup(true)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors text-green-400 hover:text-green-300 flex-shrink-0"
              title="Create Group"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
              </svg>
            </button>
          </div>

          {/* Tab Buttons  */}
          <div className="flex gap-1 mb-2">
            <button
              onClick={() => setActiveTab("chats")}
              className={`flex-1 py-1.5 px-2 rounded-md font-medium transition-all text-xs ${
                activeTab === "chats"
                  ? "bg-white text-blue-600 shadow-md"
                  : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              Chats
            </button>
            <button
              onClick={() => setActiveTab("status")}
              className={`flex-1 py-1.5 px-3 rounded-md font-medium transition-all text-xs ${
                activeTab === "status"
                  ? "bg-white text-purple-600 shadow-md"
                  : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              Status
            </button>
          </div>

          {/* Search box */}
          <div className="relative">
            <input
              type="text"
              placeholder={
                showArchived ? "Search archived..." : "Search conversations..."
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-8 py-2 bg-white/10 backdrop-blur-sm border border-white/20 text-white text-xs sm:text-sm placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent transition-all rounded-lg"
            />
            <svg
              className="w-4 h-4 text-white/60 absolute left-3 top-2.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-2.5 text-white/60 hover:text-white transition-colors"
              >
                <svg
                  className="w-3.5 h-3.5"
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
            )}
          </div>
        </div>

        {/* Users Count & Stats */}
        <div className="px-4 py-2 bg-white border-b border-gray-200 flex-shrink-0">
          <p className="text-xs text-gray-900 font-bold">
            {showArchived ? (
              // ARCHIVED VIEW
              <>
                {archivedCount} archived{" "}
                {archivedCount === 1 ? "chat" : "chats"}
              </>
            ) : (
              //  MAIN VIEW
              <>
                {memoizedItems.length}{" "}
                {memoizedItems.length === 1 ? "contact" : "contacts"}
                {searchQuery && ` found`} • {onlineCount} online
                {totalUnread > 0 && (
                  <span className="text-red-400 ml-2">
                    • {totalUnread} unread
                  </span>
                )}
              </>
            )}
          </p>
        </div>
        {activeTab === "chats" ? (
          <div className="flex-1 overflow-y-auto">
            {memoizedItems.length === 0 ? (
              <div className="text-center py-12 px-4">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-700 bg-opacity-30 flex items-center justify-center">
                  {searchQuery ? (
                    <svg
                      className="w-8 h-8 text-gray-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-8 h-8 text-gray-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                  )}
                </div>
                <p className="text-gray-400 text-sm">
                  {showArchived
                    ? "No archived chats"
                    : searchQuery
                      ? `No friends found for "${searchQuery}"`
                      : "No contacts yet"}
                </p>
                <p className="text-gray-500 text-xs mt-1">
                  {searchQuery
                    ? "Try searching by username or email"
                    : "Start by adding some friends!"}
                </p>
              </div>
            ) : (
              <div className="py-2">
                {memoizedItems.map((item) => {
                  if (item.isGroup) {
                    const lastMsg = lastMessages[item._id];
                    const formattedText = formatLastMessageText(lastMsg);
                    return (
                      <GroupItem
                        key={item._id}
                        group={item}
                        selected={selectedUserId === item._id}
                        onClick={() => onSelectUser({ ...item, isGroup: true })}
                        onPinConversation={onPinConversation}
                        onArchiveConversation={onArchiveConversation}
                        isPinned={item.pinnedBy?.some(
                          (p) => p.userId === currentUserId,
                        )}
                        isArchived={item.archivedBy?.some(
                          (a) => a.userId === currentUserId,
                        )}
                        conversationId={item._id}
                        currentUserId={currentUserId}
                        unreadCount={unreadCounts[item._id] || 0}
                        lastMessage={formattedText}
                        lastMessageTime={lastMsg?.time || null}
                        lastMessageSender={lastMsg?.sender || null}
                        lastMessageStatus={lastMsg?.status || "sent"}
                        onGroupUpdate={(updatedGroup) => {
                          onGroupUpdate(updatedGroup);
                        }}
                        onGroupDeleted={() => {
                          window.location.reload();
                        }}
                      />
                    );
                  } else {
                    const lastMsg = lastMessages[item._id];
                    const formattedText = formatLastMessageText(lastMsg);
                    const conversationId = lastMsg?.conversationId;
                    const isPinned =
                      conversationId && pinnedConversations.has(conversationId);
                    const isArchived =
                      conversationId &&
                      archivedConversations.has(conversationId);
                    return (
                      <UserItem
                        key={item._id}
                        user={item}
                        selected={item._id === selectedUserId}
                        onClick={() => onSelectUser(item)}
                        // AFTER
                        isOnline={onlineUsers.includes(item._id)}
                        unreadCount={unreadCounts[item._id] || 0}
                        lastMessage={formattedText}
                        lastMessageTime={lastMsg?.time || null}
                        lastMessageSender={lastMsg?.sender || null}
                        lastMessageStatus={lastMsg?.status || "sent"}
                        currentUserId={currentUserId}
                        onRelationshipChange={() => window.location.reload()}
                        isPinned={isPinned}
                        conversationId={conversationId}
                        onPinConversation={onPinConversation}
                        isArchived={isArchived}
                        onArchiveConversation={onArchiveConversation}
                        onConversationDeleted={onConversationDeleted}
                      />
                    );
                  }
                })}
              </div>
            )}
          </div>
        ) : (
          // STATUS TAB - Status Rings List
          <div className="flex-1 overflow-y-auto">
            <StatusRingsList
              onOpenViewer={onOpenStatusViewer}
              currentUserId={currentUserId}
              onCreateStatus={onOpenStatusManager}
              onViewMyStatus={onViewMyStatus}
              currentUserForStatus={currentUserForStatus}
            />
          </div>
        )}
      </div>

      {showCreateGroup && (
        <CreateGroupDialog
          friends={users}
          currentUserId={currentUserId}
          onClose={() => setShowCreateGroup(false)}
          // AFTER
          onSuccess={(newGroup) => {
            setShowCreateGroup(false);
            onSelectUser({ ...newGroup, isGroup: true });
          }}
        />
      )}
      <AlertDialog
        isOpen={alertDialog.isOpen}
        onClose={() => setAlertDialog({ ...alertDialog, isOpen: false })}
        title={alertDialog.title}
        message={alertDialog.message}
        type={alertDialog.type}
      />
      <BlockedUsersModal
        isOpen={showBlockedModal}
        onClose={() => setShowBlockedModal(false)}
        blockedUsers={blockedUsers}
        onUnblock={handleUnblockUser}
      />

      <FriendRequestsModal
        isOpen={showRequestsModal}
        onClose={() => setShowRequestsModal(false)}
        pendingRequests={pendingRequests}
        onAccept={handleAcceptRequest}
        onReject={handleRejectRequest}
      />
      <NotificationModal
        isOpen={showNotificationModal}
        onClose={() => setShowNotificationModal(false)}
        notifications={notifications}
      />
      <AddFriendModal
        isOpen={showAddFriendModal}
        onClose={() => {
          setShowAddFriendModal(false);
          setAllUsers([]);
          setSearchUsers("");
        }}
        searchUsers={searchUsers}
        setSearchUsers={setSearchUsers}
        allUsers={allUsers}
        loading={loading}
        onSearch={handleSearchUsers}
        onSendRequest={handleSendRequest}
      />
    </>
  );
}
