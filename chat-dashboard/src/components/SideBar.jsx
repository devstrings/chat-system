import React, { useState, useMemo, useEffect } from "react";
import UserItem from "@/components/UserItem";
import GroupItem from "@/components/Group/GroupItem";
import AlertDialog from "@/components/base/AlertDialog";
import ProfileSetting from "@/components/ProfileSetting";
import StatusManager from "@/components/Status/StatusManager";
import StatusViewer from "@/components/Status/StatusViewer";
import { useAuthImage } from "@/hooks/useAuthImage";
import { useDispatch, useSelector } from "react-redux";
import {
  searchUsers,
  sendFriendRequest,
  formatLastMessageText,
} from "@/actions/sidebar.actions";
import {
  fetchFriendsList,
  fetchPendingRequests,
  fetchBlockedUsers,
  acceptFriendRequest,
  rejectFriendRequest,
  unblockUser,
} from "@/store/slices/userSlice";
import { setUser } from "@/store/slices/authSlice";
import { fetchGroups, updateGroup } from "@/store/slices/groupSlice";
import {
  archiveConversation,
  pinConversation,
  deleteConversation,
  setSelectedUserId,
} from "@/store/slices/chatSlice";
import {
  loadAllStatuses,
  loadPinnedConversations,
  loadArchivedConversations,
} from "@/actions/dashboard.actions";
import CreateGroupModal from "@/components/CreateGroupModal";
import NotificationModal from "@/components/NotificationModal";
import BlockedUsersModal from "@/components/BlockedUsersModal";
import FriendRequestModal from "@/components/FriendRequestModal";
import AddFriendModal from "@/components/AddFriendModal";
import StatusRingsList from "@/components/Status/StatusRingsList";

export default function Sidebar({
  selectedUserId,
  onSelectUser,
  currentUsername = "",
  currentUserId = "",
  onLogout,
  isMobileSidebarOpen = false,
  lastMessages: middlewareLastMessages = {},
  onCloseMobileSidebar = () => {},
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchDirectoryResults, setSearchDirectoryResults] = useState([]);
  const [searchUserQuery, setSearchUserQuery] = useState("");
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);
  const [showBlockedModal, setShowBlockedModal] = useState(false);
  const [showRequestsModal, setShowRequestsModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [notifications] = useState([]);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [activeTab, setActiveTab] = useState("chats");
  const [showArchived, setShowArchived] = useState(false);
  const [pinnedConversations, setPinnedConversations] = useState(new Set());
  const [archivedConversations, setArchivedConversations] = useState(new Set());
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [profileSettingsView, setProfileSettingsView] = useState("all");
  const [sharedCoverPhoto, setSharedCoverPhoto] = useState(null);
  const [allStatuses, setAllStatuses] = useState([]);
  const [showStatusManager, setShowStatusManager] = useState(false);
  const [statusManagerMode, setStatusManagerMode] = useState("create");
  const [showStatusViewer, setShowStatusViewer] = useState(false);
  const [statusViewerIndex, setStatusViewerIndex] = useState(0);
  const [alertDialog, setAlertDialog] = useState({
    isOpen: false,
    title: "",
    message: "",
    type: "success",
  });

  const dispatch = useDispatch();
  const socket = useSelector((state) => state.socket.socket);
  const onlineUsers = useSelector((state) => state.socket.onlineUsers);
  const { pendingRequests, blockedUsers, friends: users } = useSelector(
    (state) => state.user,
  );
  const { currentUser } = useSelector((state) => state.auth);
  const { groups } = useSelector((state) => state.group);
  const { unreadCounts, lastMessages } = useSelector((state) => state.chat);
  const effectiveLastMessages = lastMessages || middlewareLastMessages;
  const { imageSrc: profilePreview, loading: imageLoading } = useAuthImage(
    currentUser?.profileImage,
  );

  useEffect(() => {
    dispatch(fetchPendingRequests());
  }, [dispatch]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchDirectoryResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const results = await searchUsers(searchQuery.trim());
        const friendIds = new Set(users.map((u) => u._id));
        const normalized = results
          .filter((u) => u._id !== currentUserId)
          .map((u) => ({
            ...u,
            isFriend: friendIds.has(u._id),
            requestSent: false,
          }));
        setSearchDirectoryResults(normalized);
      } catch (error) {
        console.error("Sidebar search failed:", error);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery, users, currentUserId]);

  useEffect(() => {
    if (!currentUserId) return;
    const load = async () => {
      try {
        const pinnedIdsArray = await loadPinnedConversations();
        setPinnedConversations(new Set(pinnedIdsArray));
      } catch (err) {
        console.error("Failed to load pinned conversations:", err);
      }
    };
    load();
  }, [currentUserId]);

  useEffect(() => {
    if (!currentUserId) return;
    const load = async () => {
      try {
        const archivedIdsArray = await loadArchivedConversations();
        setArchivedConversations(new Set(archivedIdsArray));
      } catch (err) {
        console.error("Failed to load archived conversations:", err);
      }
    };
    load();
  }, [currentUserId]);

  useEffect(() => {
    if (!groups || groups.length === 0) return;
    const archivedGroupIds = groups
      .filter((g) => g.archivedBy?.some((a) => a.userId === currentUserId))
      .map((g) => g._id);
    setArchivedConversations((prev) => {
      const next = new Set(prev);
      archivedGroupIds.forEach((id) => next.add(id));
      return next;
    });
  }, [groups, currentUserId]);

  useEffect(() => {
    if (!currentUserId) return;
    const load = async () => {
      try {
        const data = await loadAllStatuses();
        setAllStatuses(data);
      } catch (err) {
        console.error("Load statuses error:", err);
      }
    };
    load();
  }, [currentUserId]);

  const memoizedItems = useMemo(() => {
    if (searchQuery.trim()) {
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
          return showArchived
            ? matchesSearch && isArchived
            : matchesSearch && !isArchived;
        })
        .map((group) => ({ ...group, isGroup: true }));

      return [...filteredGroups, ...allFilteredUsers].sort((a, b) => {
        const timeA = effectiveLastMessages[a._id]?.time
          ? new Date(effectiveLastMessages[a._id].time).getTime()
          : 0;
        const timeB = effectiveLastMessages[b._id]?.time
          ? new Date(effectiveLastMessages[b._id].time).getTime()
          : 0;
        return timeB - timeA;
      });
    }

    const filteredUsers = users
      .filter((user) => {
        const convId = effectiveLastMessages[user._id]?.conversationId;
        if (!convId) return false;
        const isArchived = archivedConversations.has(convId);
        return showArchived ? isArchived : !isArchived;
      })
      .map((user) => ({ ...user, isGroup: false }));

    const filteredGroups = groups
      .filter((group) => {
        const isArchived = group.archivedBy?.some(
          (a) => a.userId === currentUserId,
        );
        return showArchived ? isArchived : !isArchived;
      })
      .map((group) => ({ ...group, isGroup: true }));

    return [...filteredGroups, ...filteredUsers].sort((a, b) => {
      if (!showArchived) {
        let aPinned = false;
        let bPinned = false;
        if (a.isGroup) {
          aPinned = a.pinnedBy?.some((p) => p.userId === currentUserId);
        } else {
          const convIdA = effectiveLastMessages[a._id]?.conversationId;
          aPinned = convIdA && pinnedConversations.has(convIdA);
        }
        if (b.isGroup) {
          bPinned = b.pinnedBy?.some((p) => p.userId === currentUserId);
        } else {
          const convIdB = effectiveLastMessages[b._id]?.conversationId;
          bPinned = convIdB && pinnedConversations.has(convIdB);
        }
        if (aPinned && !bPinned) return -1;
        if (!aPinned && bPinned) return 1;
      }

      const getTimestamp = (item) => {
        const msg = item.isGroup
          ? effectiveLastMessages[`group_${item._id}`]
          : effectiveLastMessages[item._id];
        if (msg?._updated) return msg._updated;
        if (msg?.time) return new Date(msg.time).getTime();
        if (item.updatedAt) return new Date(item.updatedAt).getTime();
        return 0;
      };

      return getTimestamp(b) - getTimestamp(a);
    });
  }, [
    users,
    groups,
    searchQuery,
    effectiveLastMessages,
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
    const convId = effectiveLastMessages[user._id]?.conversationId;
    return convId && archivedConversations.has(convId);
  }).length;

  const handleSearchUsers = async () => {
    if (!searchUserQuery.trim()) return;
    setLoading(true);
    try {
      const data = await searchUsers(searchUserQuery);
      setAllUsers(data);
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
      await sendFriendRequest(userId);
      setAlertDialog({
        isOpen: true,
        title: "Friend Request Sent!",
        message: "Your friend request has been sent successfully.",
        type: "success",
      });
      setAllUsers(allUsers.filter((u) => u._id !== userId));
      setSearchDirectoryResults((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, requestSent: true } : u)),
      );
      setTimeout(() => {
        setShowAddFriendModal(false);
        setSearchUserQuery("");
        setAllUsers([]);
      }, 1000);
    } catch (err) {
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

  const openPendingRequests = async () => {
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
        dispatch(fetchFriendsList());
        dispatch(fetchPendingRequests());
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
      setTimeout(() => setShowRequestsModal(false), 1000);
    } catch (err) {
      setAlertDialog({
        isOpen: true,
        title: "Error",
        message: err || "Failed to reject request",
        type: "error",
      });
    }
  };

  const openBlockedUsers = async () => {
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
      const remainingBlocked = blockedUsers.filter((b) => b.blocked._id !== userId);
      if (remainingBlocked.length === 0) {
        setTimeout(() => setShowBlockedModal(false), 1000);
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

  const handleOpenProfileSettings = (view = "all") => {
    setProfileSettingsView(view);
    setShowProfileSettings(true);
  };

  const handleProfileImageUpdate = (newImageUrl, isCoverPhoto = false) => {
    if (isCoverPhoto) {
      setSharedCoverPhoto(newImageUrl);
      dispatch(setUser({ ...currentUser, coverPhoto: newImageUrl }));
      return;
    }
    dispatch(setUser({ ...currentUser, profileImage: newImageUrl }));
  };

  const handleArchiveConversation = async (conversationId, isArchived) => {
    try {
      const isGroup = groups.some((g) => g._id === conversationId);
      const result = await dispatch(
        archiveConversation({ conversationId, isArchived, isGroup }),
      ).unwrap();
      setArchivedConversations((prev) => {
        const next = new Set(prev);
        if (result.isArchived) next.add(conversationId);
        else next.delete(conversationId);
        return next;
      });
    } catch (err) {
      setAlertDialog({
        isOpen: true,
        title: "Error",
        message: err.message || "Failed to update archive status",
        type: "error",
      });
    }
  };

  const handlePinConversation = async (conversationId, isPinned) => {
    try {
      const isGroup = groups.some((g) => g._id === conversationId);
      const result = await dispatch(
        pinConversation({ conversationId, isPinned, isGroup }),
      ).unwrap();
      setPinnedConversations((prev) => {
        const next = new Set(prev);
        if (result.isPinned) next.add(conversationId);
        else next.delete(conversationId);
        return next;
      });
    } catch (err) {
      setAlertDialog({
        isOpen: true,
        title: "Error",
        message: err.message || "Failed to update pin status",
        type: "error",
      });
    }
  };

  const handleConversationDeleted = (userId) => {
    const conversationIdToRemove = effectiveLastMessages[userId]?.conversationId;
    if (conversationIdToRemove) {
      dispatch(
        deleteConversation({
          conversationId: conversationIdToRemove,
          otherUserId: userId,
        }),
      );
      setPinnedConversations((prev) => {
        const next = new Set(prev);
        next.delete(conversationIdToRemove);
        return next;
      });
      setArchivedConversations((prev) => {
        const next = new Set(prev);
        next.delete(conversationIdToRemove);
        return next;
      });
    }
    dispatch(setSelectedUserId(null));
  };

  const handleOpenStatusManager = (mode = "create") => {
    setStatusManagerMode(mode);
    setShowStatusManager(true);
  };

  const handleOpenStatusViewer = (userStatusOrIndex) => {
    if (!allStatuses || allStatuses.length === 0) return;
    let targetIndex = 0;
    if (typeof userStatusOrIndex === "object" && userStatusOrIndex?.user?._id) {
      targetIndex = allStatuses.findIndex(
        (status) => status.user._id === userStatusOrIndex.user._id,
      );
      if (targetIndex === -1) return;
    } else if (typeof userStatusOrIndex === "number") {
      targetIndex = userStatusOrIndex;
    } else {
      return;
    }
    if (targetIndex < 0 || targetIndex >= allStatuses.length) return;
    setStatusViewerIndex(targetIndex);
    setShowStatusViewer(true);
  };

  const handleStatusCreated = async () => {
    try {
      const data = await loadAllStatuses();
      setAllStatuses(data);
    } catch (err) {
      console.error("Reload statuses error:", err);
    }
  };

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
          <img src={imageSrc} alt={username} className="w-full h-full object-cover" />
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
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="bg-gradient-to-r from-[#2563EB] to-[#9333EA] p-3">
          <div className="flex items-center justify-between mb-2 gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
              <div className="relative flex-shrink-0">
                <div
                  className="relative w-9 h-9 rounded-full overflow-hidden cursor-pointer hover:opacity-90 transition-opacity border-2 border-white/30"
                  onClick={() => handleOpenProfileSettings()}
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

            <div className="relative flex-shrink-0 ml-auto">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowProfileMenu(!showProfileMenu);
                }}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white flex items-center justify-center"
                title="Settings & More"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01" />
                </svg>
              </button>
              {showProfileMenu && (
                <>
                  <div className="fixed inset-0 z-[90] bg-black/20" onClick={() => setShowProfileMenu(false)} />
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-gray-300 rounded-lg shadow-2xl z-[91] overflow-hidden">
                    <button
                      onClick={() => {
                        handleOpenProfileSettings("settings");
                        setShowProfileMenu(false);
                      }}
                      className="w-full px-4 py-3 text-left text-gray-900 hover:bg-gray-100 transition-colors text-sm"
                    >
                      Settings
                    </button>
                    <button
                      onClick={() => {
                        handleOpenProfileSettings("password");
                        setShowProfileMenu(false);
                      }}
                      className="w-full px-4 py-3 text-left text-gray-900 hover:bg-gray-100 transition-colors text-sm border-t border-gray-200"
                    >
                      Change Password
                    </button>
                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        onLogout();
                      }}
                      className="w-full px-4 py-3 text-left text-red-600 hover:bg-red-50 transition-colors text-sm border-t border-gray-200"
                    >
                      Logout
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between gap-0.5 mb-2 px-0">
            <button
              onClick={() => setShowArchived(!showArchived)}
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
              onClick={openBlockedUsers}
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
              onClick={openPendingRequests}
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

          <div className="relative">
            <input
              type="text"
              placeholder={showArchived ? "Search archived..." : "Search conversations..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-3 pr-3 py-2 bg-white/10 border border-white/20 text-white text-xs sm:text-sm placeholder-white/60 rounded-lg"
            />
          </div>
        </div>

        <div className="px-4 py-2 bg-white border-b border-gray-200 flex-shrink-0">
          <p className="text-xs text-gray-900 font-bold">
            {searchQuery.trim() ? searchDirectoryResults.length : memoizedItems.length} contacts
            {" • "}
            {onlineCount} online
            {totalUnread > 0 && <span className="text-red-400 ml-2">• {totalUnread} unread</span>}
          </p>
        </div>

        {activeTab === "chats" ? (
          <div className="flex-1 overflow-y-auto">
            {searchQuery.trim() ? (
              <div className="py-2 space-y-2 px-2">
                {searchDirectoryResults.map((person) => (
                  <div
                    key={person._id}
                    onClick={() => {
                      if (!person.isFriend) return;
                      onSelectUser(person);
                      onCloseMobileSidebar();
                    }}
                    className={`bg-gray-50 border border-gray-200 rounded-lg p-3 flex items-center justify-between ${
                      person.isFriend ? "cursor-pointer hover:bg-gray-100 transition-colors" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <ProfileImageWithAuth
                        imageUrl={person.profileImage}
                        username={person.username}
                        size="w-10 h-10"
                        textSize="text-sm"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{person.username}</p>
                        <p className="text-xs text-gray-500 truncate">{person.email}</p>
                      </div>
                    </div>
                    {!person.isFriend ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSendRequest(person._id);
                        }}
                        disabled={person.requestSent}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-md disabled:opacity-60"
                      >
                        {person.requestSent ? "Sent" : "Send Request"}
                      </button>
                    ) : (
                      <span className="px-3 py-1.5 bg-blue-100 text-blue-700 text-xs rounded-md font-medium">
                        Message
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-2">
                {memoizedItems.map((item) => {
                  if (item.isGroup) {
                    const lastMsg = effectiveLastMessages[`group_${item._id}`];
                    const formattedText = formatLastMessageText(lastMsg);
                    return (
                      <GroupItem
                        key={item._id}
                        group={item}
                        selected={selectedUserId === item._id}
                        onClick={() => onSelectUser({ ...item, isGroup: true })}
                        onPinConversation={handlePinConversation}
                        onArchiveConversation={handleArchiveConversation}
                        isPinned={item.pinnedBy?.some((p) => p.userId === currentUserId)}
                        isArchived={item.archivedBy?.some((a) => a.userId === currentUserId)}
                        conversationId={item._id}
                        currentUserId={currentUserId}
                        unreadCount={unreadCounts[item._id] || 0}
                        lastMessage={formattedText}
                        lastMessageTime={lastMsg?.time || null}
                        lastMessageSender={lastMsg?.sender || null}
                        lastMessageStatus={lastMsg?.status || "sent"}
                        onGroupUpdate={(updatedGroup) => dispatch(updateGroup(updatedGroup))}
                        onGroupDeleted={() => dispatch(fetchGroups())}
                      />
                    );
                  }

                  const lastMsg = effectiveLastMessages[item._id];
                  const formattedText = formatLastMessageText(lastMsg);
                  const conversationId = lastMsg?.conversationId;
                  const isPinned = conversationId && pinnedConversations.has(conversationId);
                  const isArchived = conversationId && archivedConversations.has(conversationId);
                  return (
                    <UserItem
                      key={item._id}
                      user={item}
                      selected={item._id === selectedUserId}
                      onClick={() => onSelectUser(item)}
                      isOnline={onlineUsers.includes(item._id)}
                      unreadCount={unreadCounts[item._id] || 0}
                      lastMessage={formattedText}
                      lastMessageTime={lastMsg?.time || null}
                      lastMessageSender={lastMsg?.sender || null}
                      lastMessageStatus={lastMsg?.status || "sent"}
                      currentUserId={currentUserId}
                      onRelationshipChange={() => dispatch(fetchFriendsList())}
                      isPinned={isPinned}
                      conversationId={conversationId}
                      onPinConversation={handlePinConversation}
                      isArchived={isArchived}
                      onArchiveConversation={handleArchiveConversation}
                      onConversationDeleted={handleConversationDeleted}
                    />
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <StatusRingsList
              onOpenViewer={handleOpenStatusViewer}
              currentUserId={currentUserId}
              onCreateStatus={handleOpenStatusManager}
              onViewMyStatus={() => handleOpenStatusManager("myStatus")}
              currentUserForStatus={currentUser}
              socket={socket}
            />
          </div>
        )}
      </div>

      {showCreateGroup && (
        <CreateGroupModal
          friends={users}
          currentUserId={currentUserId}
          onClose={() => setShowCreateGroup(false)}
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
      <FriendRequestModal
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
          setSearchUserQuery("");
        }}
        searchUsers={searchUserQuery}
        setSearchUsers={setSearchUserQuery}
        allUsers={allUsers}
        loading={loading}
        onSearch={handleSearchUsers}
        onSendRequest={handleSendRequest}
      />
      {showProfileSettings && (
        <ProfileSetting
          currentUser={currentUser}
          onClose={() => setShowProfileSettings(false)}
          onProfileImageUpdate={handleProfileImageUpdate}
          coverPhotoUrl={sharedCoverPhoto || currentUser?.coverPhoto}
          initialView={profileSettingsView}
        />
      )}
      {showStatusManager && (
        <StatusManager
          currentUser={currentUser}
          onClose={() => setShowStatusManager(false)}
          onStatusCreated={handleStatusCreated}
          mode={statusManagerMode}
        />
      )}
      {showStatusViewer && allStatuses.length > 0 && (
        <StatusViewer
          statuses={allStatuses}
          currentUserId={currentUserId}
          onClose={() => setShowStatusViewer(false)}
          initialUserIndex={statusViewerIndex}
        />
      )}
    </>
  );
}
