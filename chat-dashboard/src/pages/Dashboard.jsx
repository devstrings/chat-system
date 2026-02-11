import { useEffect, useState, useRef, useCallback } from "react";
import API_BASE_URL from "../config/api";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/SideBar";
import ChatWindow from "../components/ChatWindow";
import MessageInput from "../components/MessageInput";
import ConfirmationDialog, {
  AlertDialog,
} from "../components/ConfirmationDialog";
import { useAuthImage } from "../hooks/useAuthImage";
import ProfileSetting from "../components/ProfileSetting";
import GroupChatWindow from "../components/Group/GroupChatWindow";
import StatusManager from "../components/Status/StatusManager";
import StatusViewer from "../components/Status/StatusViewer";
import StatusRingsList from "../components/Status/StatusRingsList";
import axiosInstance from "../utils/axiosInstance";

import { setUser } from "../store/slices/authSlice";
import { useDispatch, useSelector } from "react-redux";
import { logout, fetchCurrentUser } from "../store/slices/authSlice";
import { fetchFriendsList } from "../store/slices/userSlice";
import { fetchGroups } from "../store/slices/groupSlice";
import {
  fetchConversation,
  fetchMessages,
  clearUnreadCount,
  addMessage,
  incrementUnreadCount,
  deleteConversation,
  updateMessageStatus,
  updateMessage,
} from "../store/slices/chatSlice";
import { addGroupMessage, updateGroup } from "../store/slices/groupSlice";
export default function Dashboard() {
  const [selectedUser, setSelectedUser] = useState(null);
  const [conversationId, setConversationId] = useState(null);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const socket = useSelector((state) => state.socket.socket);
  const connected = useSelector((state) => state.socket.connected);
  const onlineUsers = useSelector((state) => state.socket.onlineUsers);

  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Redux state
  const { currentUser, currentUserId, isAuthenticated } = useSelector(
    (state) => state.auth,
  );
  const { friends: users } = useSelector((state) => state.user);
  const { groups } = useSelector((state) => state.group);
  const { unreadCounts, lastMessages } = useSelector((state) => state.chat);

  const [loading, setLoading] = useState(true);

  const [showChatMenu, setShowChatMenu] = useState(false);
  const [searchInChat, setSearchInChat] = useState("");
  const [showSearchBox, setShowSearchBox] = useState(false);

  const selectedUserRef = useRef(null);
  const hasInitialized = useRef(false);
  const lastMessagesRef = useRef({});
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [pinnedConversations, setPinnedConversations] = useState(new Set());
  const [archivedConversations, setArchivedConversations] = useState(new Set());
  const [showArchived, setShowArchived] = useState(false);

  const [sharedProfileImage, setSharedProfileImage] = useState(null);
  const [sharedCoverPhoto, setSharedCoverPhoto] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [isGroupChat, setIsGroupChat] = useState(false);
  const [currentUserCoverPhoto, setCurrentUserCoverPhoto] = useState(null);
  const [profileSettingsView, setProfileSettingsView] = useState("all");

  const [showStatusManager, setShowStatusManager] = useState(false);
  const [statusManagerMode, setStatusManagerMode] = useState("create");
  const [showStatusViewer, setShowStatusViewer] = useState(false);
  const [statusViewerIndex, setStatusViewerIndex] = useState(0);
  const [allStatuses, setAllStatuses] = useState([]);
  const [showStatusRings, setShowStatusRings] = useState(false);

  const { imageSrc: selectedGroupImage } = useAuthImage(
    isGroupChat ? selectedGroup?.groupImage : null,
    "group",
  );
  // Clear chat dialog state
  const [clearChatDialog, setClearChatDialog] = useState({
    isOpen: false,
    username: "",
  });

  const [alertDialog, setAlertDialog] = useState({
    isOpen: false,
    title: "",
    message: "",
    type: "info",
  });

  //SOCKET LISTENERS FOR SIDEBAR UPDATES
  useEffect(() => {
    if (!socket || !currentUserId) return;

    console.log(" Setting up sidebar socket listeners");

    //  Individual message received
    const handleSidebarMessage = (msg) => {
      console.log(" [DASHBOARD] Individual message received:", {
        id: msg._id,
        conversationId: msg.conversationId,
        sender: msg.sender?._id,
        receiver: msg.receiver?._id,
        text: msg.text,
      });

      const senderId = msg.sender?._id || msg.sender;
      const receiverId = msg.receiver?._id || msg.receiver;

      //  FIND OTHER USER
      let otherUserId;

      if (
        senderId === currentUserId ||
        senderId?.toString() === currentUserId
      ) {
        otherUserId = receiverId;
      } else {
        otherUserId = senderId;
      }

      //  CONVERT TO STRING
      if (typeof otherUserId === "object" && otherUserId?._id) {
        otherUserId = otherUserId._id;
      }
      otherUserId = otherUserId?.toString();

      if (!otherUserId) {
        console.error(" Cannot determine otherUserId!");
        return;
      }

      console.log(` Updating Redux for userId: "${otherUserId}"`);

      //  UPDATE REDUX
      dispatch(
        addMessage({
          conversationId: msg.conversationId,
          message: msg,
          userId: otherUserId,
          isGroup: false,
        }),
      );
    };
    //  Group message received
    const handleSidebarGroupMessage = (msg) => {
      console.log(" [SIDEBAR] Group message:", msg._id);

      // Update group messages in groupSlice
      dispatch(
        addGroupMessage({
          groupId: msg.groupId,
          message: msg,
        }),
      );

      // Also update lastMessages for sidebar
      dispatch(
        addMessage({
          conversationId: msg.groupId,
          message: msg,
          userId: msg.groupId,
          isGroup: true,
        }),
      );
    };

    //  Status update
    const handleSidebarStatus = (data) => {
      console.log(" [SIDEBAR] Status update:", data.messageId);

      dispatch(
        updateMessageStatus({
          conversationId: data.conversationId,
          messageId: data.messageId,
          status: data.status,
        }),
      );
    };

    //  Message edited
    const handleSidebarEdit = (data) => {
      console.log(" [SIDEBAR] Message edited:", data.messageId);

      dispatch(
        updateMessage({
          conversationId: data.conversationId,
          messageId: data.messageId,
          text: data.text,
          editedAt: data.editedAt,
        }),
      );
    };
    //  ADD THIS - Group message edited
    const handleSidebarGroupEdit = (data) => {
      console.log(" [SIDEBAR] Group message edited:", data.messageId);

      dispatch(
        updateGroupMessage({
          groupId: data.groupId,
          messageId: data.messageId,
          text: data.text,
          editedAt: data.editedAt,
        }),
      );
    };

    socket.on("receiveMessage", handleSidebarMessage);
    socket.on("receiveGroupMessage", handleSidebarGroupMessage);
    socket.on("messageStatusUpdate", handleSidebarStatus);
    socket.on("messageEdited", handleSidebarEdit);
    socket.on("groupMessageEdited", handleSidebarGroupEdit);

    return () => {
      console.log(" Cleaning up sidebar socket listeners");
      socket.off("receiveMessage", handleSidebarMessage);
      socket.off("receiveGroupMessage", handleSidebarGroupMessage);
      socket.off("messageStatusUpdate", handleSidebarStatus);
      socket.off("messageEdited", handleSidebarEdit);
      socket.off("groupMessageEdited", handleSidebarGroupEdit);
    };
  }, [socket, currentUserId, dispatch]);
  // Load all statuses
  useEffect(() => {
    const loadAllStatuses = async () => {
      try {
        const token =
          localStorage.getItem("accessToken") ||
          localStorage.getItem("accessToken");
        const response = await axiosInstance.get(
          `${API_BASE_URL}/api/status`,
          {},
        );
        setAllStatuses(response.data);
      } catch (err) {
        console.error("Load statuses error:", err);
      }
    };

    if (currentUserId) {
      loadAllStatuses();
    }
  }, [currentUserId]);

  useEffect(() => {
    selectedUserRef.current = selectedUser;
  }, [selectedUser]);
  useEffect(() => {
    lastMessagesRef.current = lastMessages;
  }, [lastMessages]);

  // Load pinned conversations
  useEffect(() => {
    const loadPinnedConversations = async () => {
      try {
        const token = localStorage.getItem("accessToken");
        const response = await axiosInstance.get(
          `${API_BASE_URL}/api/messages/pinned`,
        );

        const pinnedIds = new Set(response.data.map((conv) => conv._id));
        setPinnedConversations(pinnedIds);
      } catch (err) {
        console.error("Failed to load pinned conversations:", err);
      }
    };

    if (currentUserId) {
      loadPinnedConversations();
    }
  }, [currentUserId]);

  const { imageSrc: selectedUserImage } = useAuthImage(
    selectedUser?.profileImage,
  );

  // Load archived conversations
  useEffect(() => {
    const loadArchivedConversations = async () => {
      try {
        const token = localStorage.getItem("accessToken");
        const response = await axiosInstance.get(
          `${API_BASE_URL}/api/messages/archived`,
        );

        const archivedIds = new Set(response.data.map((conv) => conv._id));
        setArchivedConversations(archivedIds);
      } catch (err) {
        console.error("Failed to load archived conversations:", err);
      }
    };

    if (currentUserId) {
      loadArchivedConversations();
    }
  }, [currentUserId]);

  //  - LOAD ARCHIVED GROUPS
  useEffect(() => {
    const loadArchivedGroups = () => {
      if (!groups || groups.length === 0) return;

      // Extract archived group IDs
      const archivedGroupIds = groups
        .filter((g) => g.archivedBy?.some((a) => a.userId === currentUserId))
        .map((g) => g._id);

      // Add to archivedConversations Set
      setArchivedConversations((prev) => {
        const newSet = new Set(prev);
        archivedGroupIds.forEach((id) => newSet.add(id));
        return newSet;
      });
    };

    loadArchivedGroups();
  }, [groups, currentUserId]);
  // Handler to update profile image from ProfileSettings
  const handleProfileImageUpdate = (newImageUrl, isCoverPhoto = false) => {
    if (isCoverPhoto) {
      //  UPDATE BOTH STATES
      setSharedCoverPhoto(newImageUrl);
      dispatch(setUser({ ...currentUser, coverPhoto: newImageUrl }));
    } else {
      setSharedProfileImage(newImageUrl);
      dispatch(setUser({ ...currentUser, profileImage: newImageUrl }));
    }
  };
  //   handleRemoveProfileImage function
  const handleRemoveProfileImage = async () => {
    try {
      const token = localStorage.getItem("accessToken");
      await axiosInstance.delete(
        `${API_BASE_URL}/api/users/profile/remove-image`,
        {},
      );

      // UPDATE SHARED STATE
      setSharedProfileImage(null);
      dispatch(setUser({ ...currentUser, profileImage: null }));
      setShowProfileSettings(false);

      setAlertDialog({
        isOpen: true,
        title: "Success!",
        message: "Profile picture removed successfully",
        type: "success",
      });
    } catch (err) {
      setAlertDialog({
        isOpen: true,
        title: "Error",
        message:
          err.response?.data?.message || "Failed to remove profile picture",
        type: "error",
      });
    }
  };

  //Archeived

  const handleArchiveConversation = async (conversationId, isArchived) => {
    try {
      const token = localStorage.getItem("accessToken");

      // CHECK IF IT'S A GROUP
      const isGroup = groups.some((g) => g._id === conversationId);

      if (isArchived) {
        // Unarchive
        const endpoint = isGroup
          ? `${API_BASE_URL}/api/groups/${conversationId}/unarchive`
          : `${API_BASE_URL}/api/messages/conversation/${conversationId}/unarchive`;

        await axiosInstance.delete(endpoint, {});

        setArchivedConversations((prev) => {
          const newSet = new Set(prev);
          newSet.delete(conversationId);
          return newSet;
        });

        //  UPDATE REDUX STATE
        if (isGroup) {
          const updatedGroup = groups.find((g) => g._id === conversationId);
          if (updatedGroup) {
            const newArchivedBy =
              updatedGroup.archivedBy?.filter(
                (a) => a.userId !== currentUserId,
              ) || [];

            dispatch(
              updateGroup({
                ...updatedGroup,
                archivedBy: newArchivedBy,
              }),
            );
          }
        }

        setAlertDialog({
          isOpen: true,
          title: isGroup ? "Group Unarchived" : "Chat Unarchived",
          message: isGroup
            ? "Group has been restored to main list."
            : "Chat has been restored to main list.",
          type: "success",
        });
      } else {
        // Archive
        const endpoint = isGroup
          ? `${API_BASE_URL}/api/groups/${conversationId}/archive`
          : `${API_BASE_URL}/api/messages/conversation/${conversationId}/archive`;

        await axiosInstance.post(endpoint, {});

        setArchivedConversations((prev) => new Set([...prev, conversationId]));

        //  UPDATE REDUX STATE
        if (isGroup) {
          const updatedGroup = groups.find((g) => g._id === conversationId);
          if (updatedGroup) {
            const newArchivedBy = [
              ...(updatedGroup.archivedBy || []),
              { userId: currentUserId, archivedAt: new Date() },
            ];

            dispatch(
              updateGroup({
                ...updatedGroup,
                archivedBy: newArchivedBy,
              }),
            );
          }
        }

        setAlertDialog({
          isOpen: true,
          title: isGroup ? "Group Archived" : "Chat Archived",
          message: isGroup
            ? "Group has been moved to archive."
            : "Chat has been moved to archive.",
          type: "success",
        });
      }
    } catch (err) {
      setAlertDialog({
        isOpen: true,
        title: "Error",
        message:
          err.response?.data?.message || "Failed to update archive status",
        type: "error",
      });
    }
  };

  // Pin/Unpin conversation handler
  const handlePinConversation = async (conversationId, isPinned) => {
    try {
      const token = localStorage.getItem("accessToken");

      // CHECK IF IT'S A GROUP
      const isGroup = groups.some((g) => g._id === conversationId);

      if (isPinned) {
        // Unpin
        const endpoint = isGroup
          ? `${API_BASE_URL}/api/groups/${conversationId}/unpin`
          : `${API_BASE_URL}/api/messages/conversation/${conversationId}/unpin`;

        await axiosInstance.delete(endpoint, {});

        setPinnedConversations((prev) => {
          const newSet = new Set(prev);
          newSet.delete(conversationId);
          return newSet;
        });

        //  UPDATE REDUX STATE
        if (isGroup) {
          const updatedGroup = groups.find((g) => g._id === conversationId);
          if (updatedGroup) {
            const newPinnedBy =
              updatedGroup.pinnedBy?.filter(
                (p) => p.userId !== currentUserId,
              ) || [];

            dispatch(
              updateGroup({
                ...updatedGroup,
                pinnedBy: newPinnedBy,
              }),
            );
          }
        }

        setAlertDialog({
          isOpen: true,
          title: isGroup ? "Group Unpinned" : "Chat Unpinned",
          message: isGroup
            ? "Group has been unpinned successfully."
            : "Chat has been unpinned successfully.",
          type: "success",
        });
      } else {
        // Pin
        const endpoint = isGroup
          ? `${API_BASE_URL}/api/groups/${conversationId}/pin`
          : `${API_BASE_URL}/api/messages/conversation/${conversationId}/pin`;

        await axiosInstance.post(endpoint, {});

        setPinnedConversations((prev) => new Set([...prev, conversationId]));

        //  UPDATE REDUX STATE
        if (isGroup) {
          const updatedGroup = groups.find((g) => g._id === conversationId);
          if (updatedGroup) {
            const newPinnedBy = [
              ...(updatedGroup.pinnedBy || []),
              { userId: currentUserId, pinnedAt: new Date() },
            ];

            dispatch(
              updateGroup({
                ...updatedGroup,
                pinnedBy: newPinnedBy,
              }),
            );
          }
        }

        setAlertDialog({
          isOpen: true,
          title: isGroup ? "Group Pinned" : "Chat Pinned",
          message: isGroup
            ? "Group has been pinned to the top."
            : "Chat has been pinned to the top.",
          type: "success",
        });
      }
    } catch (err) {
      setAlertDialog({
        isOpen: true,
        title: "Error",
        message: err.response?.data?.message || "Failed to update pin status",
        type: "error",
      });
    }
  };
  const handleConversationDeleted = (userId) => {
    console.log(
      " [DASHBOARD] Handling conversation deletion for user:",
      userId,
    );

    const conversationIdToRemove = lastMessages[userId]?.conversationId;
    console.log(" Conversation ID to remove:", conversationIdToRemove);

    //  Use Redux deleteConversation action
    if (conversationIdToRemove) {
      dispatch(
        deleteConversation({
          conversationId: conversationIdToRemove,
          otherUserId: userId,
        }),
      );
    }

    // Clear selection if this was the selected user
    if (selectedUser?._id === userId) {
      console.log(" Clearing selected user");
      setSelectedUser(null);
      setConversationId(null);
      setIsGroupChat(false);
    }

    // Remove from pinned/archived sets (local state)
    if (conversationIdToRemove) {
      setPinnedConversations((prev) => {
        const updated = new Set(prev);
        updated.delete(conversationIdToRemove);
        return updated;
      });

      setArchivedConversations((prev) => {
        const updated = new Set(prev);
        updated.delete(conversationIdToRemove);
        return updated;
      });
      console.log(" Removed from pinned/archived");
    }

    console.log(" Conversation fully deleted from all states");
  };
  const formatAttachmentText = (attachments) => {
    if (!attachments || attachments.length === 0) return "";

    const file = attachments[0];

    //  Check isVoiceMessage flag (most reliable)
    if (file.isVoiceMessage) {
      const duration = file.duration || 0;
      if (duration > 0) {
        const mins = Math.floor(duration / 60);
        const secs = Math.floor(duration % 60);
        return `🎤 Voice (${mins}:${secs.toString().padStart(2, "0")})`;
      }
      return "🎤 Voice message";
    }

    // Priority 2: Check fileType
    const fileType = file.fileType || file.type || "";

    if (fileType.startsWith("image/")) return "📷 Photo";
    if (fileType.startsWith("video/")) return "🎥 Video";
    if (fileType === "application/pdf") return "📕 PDF";
    if (fileType.startsWith("audio/")) return "🎵 Audio";
    if (fileType.includes("word")) return "📄 Document";
    if (fileType === "text/plain") return "📝 Text file";

    // Default fallback
    return "📎 File";
  };

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const loadInitialData = async () => {
      try {
        await dispatch(fetchFriendsList()).unwrap();
        await dispatch(fetchGroups()).unwrap();
      } catch (err) {
        console.error("Failed to load initial data:", err);
        navigate("/login", { replace: true });
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [dispatch, navigate]);

  useEffect(() => {
    if (!currentUserId || (users.length === 0 && groups.length === 0)) return;

    const loadLastMessages = async () => {
      try {
        // Load messages for all friends
        for (const user of users) {
          try {
            const convRes = await axiosInstance.post(
              `${API_BASE_URL}/api/messages/conversation`,
              {
                otherUserId: user._id,
                skipCreate: true,
              },
            );

            // Skip if conversation was deleted
            if (
              convRes.data?.deletedBy?.some((d) => d.userId === currentUserId)
            ) {
              console.log(` Conversation with ${user._id} deleted, skipping`);
              continue;
            }

            const conversationId = convRes.data?._id;
            if (!conversationId) continue;

            const msgRes = await axiosInstance.get(
              `${API_BASE_URL}/api/messages/${conversationId}`,
            );

            const messages = msgRes.data;
            const visibleMessages = messages.filter(
              (msg) => !msg.deletedFor?.includes(currentUserId),
            );

            if (visibleMessages.length > 0) {
              const lastMsg = visibleMessages[visibleMessages.length - 1];

              const messageTimestamp = new Date(lastMsg.createdAt).getTime();

              //  Update Redux with timestamp
              dispatch(
                addMessage({
                  conversationId,
                  message: {
                    ...lastMsg,
                    _loadedTimestamp: messageTimestamp,
                  },
                  userId: user._id,
                  isGroup: false,
                }),
              );

              // Update unread count
              const unreadCount = messages.filter(
                (msg) =>
                  msg.sender._id !== currentUserId && msg.status !== "read",
              ).length;

              if (unreadCount > 0) {
                for (let i = 0; i < unreadCount; i++) {
                  dispatch(incrementUnreadCount(user._id));
                }
              }
            } else {
              // Empty conversation exists
              dispatch(
                addMessage({
                  conversationId,
                  message: {
                    _id: `temp-${Date.now()}`,
                    text: "",
                    createdAt: new Date().toISOString(),
                    sender: currentUserId,
                    status: "sent",
                    attachments: [],
                  },
                  userId: user._id,
                  isGroup: false,
                }),
              );
            }
          } catch (userErr) {
            if (userErr.response?.status === 404) {
              console.log(` No conversation for ${user._id}`);
              continue;
            }
            console.error(
              `Error loading messages for user ${user._id}:`,
              userErr,
            );
          }
        }

        //  Load messages for all groups
        for (const group of groups) {
          try {
            const msgRes = await axiosInstance.get(
              `${API_BASE_URL}/api/messages/group/${group._id}`,
            );

            const messages = msgRes.data;
            const visibleMessages = messages.filter(
              (msg) => !msg.deletedFor?.includes(currentUserId),
            );

            if (visibleMessages.length > 0) {
              const lastMsg = visibleMessages[visibleMessages.length - 1];

              const messageTimestamp = new Date(lastMsg.createdAt).getTime();

              dispatch(
                addMessage({
                  conversationId: group._id,
                  message: {
                    ...lastMsg,
                    _loadedTimestamp: messageTimestamp,
                  },
                  isGroup: true,
                }),
              );
            }
          } catch (err) {
            console.error(
              `Error loading messages for group ${group._id}:`,
              err,
            );
          }
        }
      } catch (err) {
        console.error("Error loading last messages:", err);
      }
    };

    loadLastMessages();
  }, [currentUserId, users, groups, dispatch]);

  useEffect(() => {
    if (!socket || !currentUserId) return;
    socket.emit("joinUserRoom", currentUserId);
  }, [socket, currentUserId]);
  // Get conversation
  useEffect(() => {
    if (!selectedUser || !selectedUser._id) {
      setConversationId(null);
      return;
    }

    const getConversation = async () => {
      try {
        const result = await dispatch(
          fetchConversation({ otherUserId: selectedUser._id }),
        ).unwrap();

        setConversationId(result._id);
        dispatch(clearUnreadCount(selectedUser._id));

        if (socket) {
          socket.emit("markAsRead", { conversationId: result._id });
        }
      } catch (err) {
        console.error("Get conversation error:", err);
      }
    };

    getConversation();
  }, [selectedUser?._id, socket]);
  useEffect(() => {
    if (!socket) return;

    console.log(" Socket connected:", socket.id);
    console.log(
      " Socket status:",
      socket.connected ? "CONNECTED" : "DISCONNECTED",
    );

    // Test event
    socket.on("connect", () => {
      console.log(" Socket CONNECTED:", socket.id);
    });

    socket.on("disconnect", () => {
      console.log(" Socket DISCONNECTED");
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
    };
  }, [socket]);
  const handleLogout = () => {
    dispatch(logout());
    navigate("/login", { replace: true });
  };
  const handleClearChat = async () => {
    try {
      const token = localStorage.getItem("accessToken");

      if (!conversationId) {
        console.error(" No conversationId!");
        return;
      }

      console.log(" Clearing chat for conversation:", conversationId);

      await axiosInstance.patch(
        `${API_BASE_URL}/api/messages/conversation/${conversationId}/clear`,
        {},
      );

      console.log(" Backend cleared successfully");

      //  Close dialog first
      setClearChatDialog({ isOpen: false, username: "" });

      //  Success alert
      setAlertDialog({
        isOpen: true,
        title: "Chat Cleared!",
        message: "Messages deleted. Chat still in list.",
        type: "success",
      });

      // No need to manually update state - socket listener will do it
      console.log(" Waiting for socket event to update UI...");
    } catch (err) {
      console.error(" Clear error:", err);
      setAlertDialog({
        isOpen: true,
        title: "Error",
        message: "Could not clear messages.",
        type: "error",
      });
    }
  };
  const handleOpenStatusManager = (mode = "create") => {
    setStatusManagerMode(mode);
    setShowStatusManager(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4 mx-auto"></div>
          <p className="text-gray-300 text-lg">Loading...</p>
        </div>
      </div>
    );
  }
  const handleOpenStatusViewer = (userStatusOrIndex) => {
    if (!allStatuses || allStatuses.length === 0) {
      setAlertDialog({
        isOpen: true,
        title: "No Status Available",
        message: "This user's status is not available right now.",
        type: "info",
      });
      return;
    }

    let targetIndex = 0;

    //  Handle both object (userStatus) and number (index) inputs
    if (typeof userStatusOrIndex === "object" && userStatusOrIndex?.user?._id) {
      // Find index by user ID
      targetIndex = allStatuses.findIndex(
        (status) => status.user._id === userStatusOrIndex.user._id,
      );

      if (targetIndex === -1) {
        console.error(" User status not found in allStatuses");
        setAlertDialog({
          isOpen: true,
          title: "Status Not Found",
          message: "Could not find this user's status.",
          type: "error",
        });
        return;
      }
    } else if (typeof userStatusOrIndex === "number") {
      targetIndex = userStatusOrIndex;
    } else {
      console.error(" Invalid parameter type:", typeof userStatusOrIndex);
      return;
    }

    //validation
    if (targetIndex < 0 || targetIndex >= allStatuses.length) {
      console.error(
        " Index out of bounds:",
        targetIndex,
        "Max:",
        allStatuses.length - 1,
      );
      return;
    }

    setStatusViewerIndex(targetIndex);
    setShowStatusViewer(true);
  };

  const handleCreateStatus = () => {
    setStatusManagerMode("create");
    setShowStatusManager(true);
    setShowStatusRings(false);
  };

  const handleViewMyStatus = () => {
    setStatusManagerMode("myStatus");
    setShowStatusManager(true);
    setShowStatusRings(false);
  };

  const handleStatusCreated = (newStatus) => {
    // Reload statuses
    const loadStatuses = async () => {
      try {
        const token = localStorage.getItem("accessToken");
        const response = await axiosInstance.get(
          `${API_BASE_URL}/api/status`,
          {},
        );
        setAllStatuses(response.data);
      } catch (err) {
        console.error("Reload statuses error:", err);
      }
    };
    loadStatuses();
  };

  return (
    <>
      <div className="flex h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 overflow-hidden">
        {/* Status Manager Modal */}

        {/*  MOBILE OVERLAY */}
        {isMobileSidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
        )}

        {/*  RESPONSIVE SIDEBAR */}

        <Sidebar
          selectedUserId={selectedUser?._id}
          onSelectUser={(user) => {
            if (user.isGroup) {
              setSelectedGroup(user);
              setSelectedUser(null);
              setIsGroupChat(true);
              setConversationId(null);
            } else {
              setSelectedUser(user);
              setSelectedGroup(null);
              setIsGroupChat(false);
            }
            setIsMobileSidebarOpen(false);
          }}
          currentUsername={currentUser?.username || ""}
          currentUserId={currentUserId}
          onLogout={handleLogout}
          isMobileSidebarOpen={isMobileSidebarOpen}
          onCloseMobileSidebar={() => setIsMobileSidebarOpen(false)}
          onOpenProfileSettings={(view = "all") => {
            setProfileSettingsView(view);
            setShowProfileSettings(true);
          }}
          profileImageUrl={sharedProfileImage}
          pinnedConversations={pinnedConversations}
          onPinConversation={handlePinConversation}
          archivedConversations={archivedConversations}
          onArchiveConversation={handleArchiveConversation}
          showArchived={showArchived}
          onToggleArchived={(show) => setShowArchived(show)}
          onGroupUpdate={(updatedGroup) => {
            dispatch(updateGroup(updatedGroup));
          }}
          onConversationDeleted={handleConversationDeleted}
          onOpenStatusManager={handleOpenStatusManager}
          allStatuses={allStatuses}
          onOpenStatusViewer={handleOpenStatusViewer}
          onCreateStatus={handleCreateStatus}
          onViewMyStatus={handleViewMyStatus}
          currentUserForStatus={currentUser}
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
        <div className="flex-1 flex flex-col min-w-0 bg-gray-50">
          {selectedUser || selectedGroup ? (
            <>
              <div className="bg-white border-b border-gray-200 px-3 md:px-6 py-3 md:py-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
                    {/* HAMBURGER MENU (MOBILE ONLY) */}
                    <button
                      onClick={() => setIsMobileSidebarOpen(true)}
                      className="md:hidden p-2 text-black transition-colors flex-shrink-0"
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
                          d="M4 6h16M4 12h16M4 18h16"
                        />
                      </svg>
                    </button>

                    {/* AVATAR */}
                    <div className="relative flex-shrink-0">
                      <div className="w-10 h-10 aspect-square rounded-full overflow-hidden shadow-md flex items-center justify-center">
                        {isGroupChat ? (
                          selectedGroupImage ? (
                            <img
                              src={selectedGroupImage}
                              className="w-full h-full object-cover"
                              alt={selectedGroup?.name}
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                              <svg
                                className="w-7 h-7 text-white"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                              </svg>
                            </div>
                          )
                        ) : selectedUserImage || selectedUser?.profileImage ? (
                          <img
                            src={
                              selectedUserImage || selectedUser?.profileImage
                            }
                            className="w-full h-full object-cover"
                            alt={selectedUser?.username}
                            crossOrigin="anonymous"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white font-bold">
                            {selectedUser.username.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>

                      {!isGroupChat && onlineUsers.has(selectedUser._id) && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                      )}
                    </div>

                    {/* NAME & STATUS */}
                    <div className="min-w-0 flex-1">
                      <h2 className="text-black font-semibold text-base md:text-lg truncate">
                        {isGroupChat
                          ? selectedGroup.name
                          : selectedUser.username}
                      </h2>
                      <p className="text-xs md:text-sm text-black flex items-center gap-1">
                        {isGroupChat ? (
                          //  GROUP MEMBER COUNT
                          `${selectedGroup.members?.length || 0} members`
                        ) : onlineUsers.has(selectedUser._id) ? (
                          //  USER ONLINE
                          <>
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                            Online
                          </>
                        ) : (
                          //  USER OFFLINE
                          <>
                            <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                            Offline
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* HEADER ACTIONS (Search, Menu) */}
                  <div className="flex items-center gap-1 md:gap-2 relative">
                    <button
                      onClick={() => setShowSearchBox(!showSearchBox)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-black"
                      title="Search in chat"
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
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                      </svg>
                    </button>

                    {/* THREE DOTS MENU - Only for individual chats */}
                    {!isGroupChat && (
                      <div className="relative">
                        <button
                          onClick={() => setShowChatMenu(!showChatMenu)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-black"
                          title="Chat options"
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

                        {showChatMenu && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setShowChatMenu(false)}
                            ></div>
                            <div className="absolute right-0 mt-2 w-52 bg-white border border-gray-200 rounded-lg shadow-xl z-20 overflow-hidden">
                              <button
                                onClick={() => {
                                  setAlertDialog({
                                    isOpen: true,
                                    title: "User Info",
                                    message: ` ${selectedUser.username}\n📧 ${
                                      selectedUser.email
                                    }\n${
                                      onlineUsers.has(selectedUser._id)
                                        ? " Online"
                                        : " Offline"
                                    }`,
                                    type: "info",
                                  });
                                  setShowChatMenu(false);
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
                                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                  />
                                </svg>
                                <span className="font-medium">
                                  View Profile
                                </span>
                              </button>

                              <button
                                onClick={() => {
                                  setClearChatDialog({
                                    isOpen: true,
                                    username: selectedUser.username,
                                  });
                                  setShowChatMenu(false);
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
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                  />
                                </svg>
                                <span className="font-medium">Clear Chat</span>
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* SEARCH BOX */}
                {showSearchBox && (
                  <div className="mt-3 relative">
                    <input
                      type="text"
                      placeholder="Search in messages..."
                      value={searchInChat}
                      onChange={(e) => setSearchInChat(e.target.value)}
                      className="w-full pl-10 pr-10 py-2 bg-gray-50 border border-gray-300 rounded-lg text-black placeholder-black placeholder-opacity-60 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <svg
                      className="w-4 h-4 text-gray-500 absolute left-3 top-3"
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
                    {searchInChat && (
                      <button
                        onClick={() => setSearchInChat("")}
                        className="absolute right-3 top-3 text-black hover:text-gray-700 transition-colors"
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
                      </button>
                    )}
                  </div>
                )}
              </div>

              {isGroupChat ? (
                //  GROUP CHAT
                <>
                  <GroupChatWindow
                    group={selectedGroup}
                    currentUserId={currentUserId}
                    searchQuery={searchInChat}
                  />
                  <MessageInput groupId={selectedGroup._id} isGroup={true} />
                </>
              ) : (
                <>
                  <ChatWindow
                    conversationId={conversationId}
                    currentUserId={currentUserId}
                    searchQuery={searchInChat}
                    selectedUser={selectedUser}
                    onUpdateLastMessageStatus={(updateData) => {}}
                  />
                  <MessageInput
                    conversationId={conversationId}
                    selectedUser={selectedUser}
                  />
                </>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-4 bg-gray-50">
              <div className="text-center">
                <button
                  onClick={() => setIsMobileSidebarOpen(true)}
                  className="md:hidden mb-6 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-lg"
                >
                  Open Chats
                </button>

                <div className="w-24 h-24 md:w-32 md:h-32 mx-auto mb-4 md:mb-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 bg-opacity-20 flex items-center justify-center">
                  <svg
                    className="w-12 h-12 md:w-16 md:h-16 text-blue-400"
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
                </div>
                <h3 className="text-xl md:text-2xl font-semibold text-white mb-2">
                  Welcome to Chat System
                </h3>
                <p className="text-sm md:text-base text-gray-400">
                  Select a conversation to start messaging
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* DIALOGS */}
      <ConfirmationDialog
        isOpen={clearChatDialog.isOpen}
        onClose={() =>
          setClearChatDialog({ ...clearChatDialog, isOpen: false })
        }
        onConfirm={handleClearChat}
        title="Clear Chat?"
        message={`Clear all messages with ${clearChatDialog.username}? This action cannot be undone.`}
        confirmText="Clear Chat"
        cancelText="Cancel"
        highlightText={clearChatDialog.username}
        icon="delete"
        type="danger"
      />

      <AlertDialog
        isOpen={alertDialog.isOpen}
        onClose={() => setAlertDialog({ ...alertDialog, isOpen: false })}
        title={alertDialog.title}
        message={alertDialog.message}
        type={alertDialog.type}
      />
      {/* Status Manager */}
      {showStatusManager && (
        <StatusManager
          currentUser={currentUser}
          onClose={() => setShowStatusManager(false)}
          onStatusCreated={handleStatusCreated}
          mode={statusManagerMode}
        />
      )}

      {/* Status Viewer */}
      {showStatusViewer && allStatuses.length > 0 && (
        <StatusViewer
          statuses={allStatuses}
          currentUserId={currentUserId}
          onClose={() => setShowStatusViewer(false)}
          initialUserIndex={statusViewerIndex}
        />
      )}

      {/* Status Rings Panel */}
      {showStatusRings && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowStatusRings(false)}
          />
          <div className="fixed right-0 top-0 bottom-0 w-96 bg-white shadow-2xl z-50 overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Status Updates</h2>
              <button
                onClick={() => setShowStatusRings(false)}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
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

            <StatusRingsList
              onOpenViewer={handleOpenStatusViewer}
              currentUserId={currentUserId}
              onCreateStatus={handleCreateStatus}
              onViewMyStatus={handleViewMyStatus}
            />
          </div>
        </>
      )}
    </>
  );
}
