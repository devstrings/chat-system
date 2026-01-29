import { useEffect, useState, useRef } from "react";
import API_BASE_URL from "../config/api";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../context/SocketContext";
import Sidebar from "../components/SideBar";
import ChatWindow from "../components/ChatWindow";
import MessageInput from "../components/MessageInput";
import axios from "axios";
import ConfirmationDialog, {
  AlertDialog,
} from "../components/ConfirmationDialog";
import { useAuthImage } from "../hooks/useAuthImage";
import ProfileSetting from "../components/ProfileSetting";
import GroupChatWindow from "../components/Group/GroupChatWindow";
import StatusManager from "../components/Status/StatusManager";
import StatusViewer from "../components/Status/StatusViewer";
import StatusRingsList from "../components/Status/StatusRingsList";
export default function Dashboard() {
  const navigate = useNavigate();
  const { socket, onlineUsers } = useSocket();
  const [username, setUsername] = useState("");
  const [currentUserId, setCurrentUserId] = useState("");
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [conversationId, setConversationId] = useState(null);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [searchInChat, setSearchInChat] = useState("");
  const [showSearchBox, setShowSearchBox] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [lastMessages, setLastMessages] = useState({});
  const selectedUserRef = useRef(null);
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

  // Group image hook (add after line 119)
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

  // Load all statuses
  useEffect(() => {
    const loadAllStatuses = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(`${API_BASE_URL}/api/status`, {
          headers: { Authorization: `Bearer ${token}` },
        });
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

  //Load current user and set shared state
  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(`${API_BASE_URL}/api/users/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCurrentUser(response.data);

        if (response.data.profileImage) {
          setSharedProfileImage(response.data.profileImage);
        }

        // Set cover photo state
        if (response.data.coverPhoto) {
          setSharedCoverPhoto(response.data.coverPhoto);
          setCurrentUserCoverPhoto(response.data.coverPhoto);
        }
      } catch (err) {
        console.error("Failed to load current user:", err);
      }
    };

    loadCurrentUser();
  }, []);

  // Load pinned conversations
  useEffect(() => {
    const loadPinnedConversations = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(
          `${API_BASE_URL}/api/messages/pinned`,
          { headers: { Authorization: `Bearer ${token}` } },
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
        const token = localStorage.getItem("token");
        const response = await axios.get(
          `${API_BASE_URL}/api/messages/archived`,
          { headers: { Authorization: `Bearer ${token}` } },
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
      setCurrentUser((prev) => ({
        ...prev,
        coverPhoto: newImageUrl,
      }));
    } else {
      setSharedProfileImage(newImageUrl);
      setCurrentUser((prev) => ({
        ...prev,
        profileImage: newImageUrl,
      }));
    }
  };
  //   handleRemoveProfileImage function
  const handleRemoveProfileImage = async () => {
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API_BASE_URL}/api/users/profile/remove-image`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // UPDATE SHARED STATE
      setSharedProfileImage(null);
      setCurrentUser((prev) => ({ ...prev, profileImage: null }));
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
      const token = localStorage.getItem("token");

      //  CHECK IF IT'S A GROUP
      const isGroup = groups.some((g) => g._id === conversationId);

      if (isArchived) {
        // Unarchive
        // Unarchive endpoint
        const endpoint = isGroup
          ? `${API_BASE_URL}/api/groups/${conversationId}/unarchive`
          : `${API_BASE_URL}/api/messages/conversation/${conversationId}/unarchive`;

        await axios.delete(endpoint, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setArchivedConversations((prev) => {
          const newSet = new Set(prev);
          newSet.delete(conversationId);
          return newSet;
        });

        // UPDATE GROUPS STATE TOO (FOR REAL-TIME UI)
        if (isGroup) {
          setGroups((prev) =>
            prev.map((g) =>
              g._id === conversationId
                ? {
                    ...g,
                    archivedBy:
                      g.archivedBy?.filter((a) => a.userId !== currentUserId) ||
                      [],
                  }
                : g,
            ),
          );
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
        // Archive endpoint
        const endpoint = isGroup
          ? `${API_BASE_URL}/api/groups/${conversationId}/archive`
          : `${API_BASE_URL}/api/messages/conversation/${conversationId}/archive`;

        await axios.post(
          endpoint,
          {},
          { headers: { Authorization: `Bearer ${token}` } },
        );

        setArchivedConversations((prev) => new Set([...prev, conversationId]));

        //  UPDATE GROUPS STATE TOO (FOR REAL-TIME UI)
        if (isGroup) {
          setGroups((prev) =>
            prev.map((g) =>
              g._id === conversationId
                ? {
                    ...g,
                    archivedBy: [
                      ...(g.archivedBy || []),
                      { userId: currentUserId, archivedAt: new Date() },
                    ],
                  }
                : g,
            ),
          );
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
      const token = localStorage.getItem("token");

      // CHECK IF IT'S A GROUP
      const isGroup = groups.some((g) => g._id === conversationId);

      if (isPinned) {
        // Unpin
        // Unpin
        const endpoint = isGroup
          ? `${API_BASE_URL}/api/groups/${conversationId}/unpin`
          : `${API_BASE_URL}/api/messages/conversation/${conversationId}/unpin`;

        await axios.delete(endpoint, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setPinnedConversations((prev) => {
          const newSet = new Set(prev);
          newSet.delete(conversationId);
          return newSet;
        });

        //  UPDATE GROUPS STATE TOO (FOR REAL-TIME UI)
        if (isGroup) {
          setGroups((prev) =>
            prev.map((g) =>
              g._id === conversationId
                ? {
                    ...g,
                    pinnedBy:
                      g.pinnedBy?.filter((p) => p.userId !== currentUserId) ||
                      [],
                  }
                : g,
            ),
          );
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
        // Pin
        const endpoint = isGroup
          ? `${API_BASE_URL}/api/groups/${conversationId}/pin`
          : `${API_BASE_URL}/api/messages/conversation/${conversationId}/pin`;

        await axios.post(
          endpoint,
          {},
          { headers: { Authorization: `Bearer ${token}` } },
        );

        setPinnedConversations((prev) => new Set([...prev, conversationId]));

        // UPDATE GROUPS STATE TOO (FOR REAL-TIME UI)
        if (isGroup) {
          setGroups((prev) =>
            prev.map((g) =>
              g._id === conversationId
                ? {
                    ...g,
                    pinnedBy: [
                      ...(g.pinnedBy || []),
                      { userId: currentUserId, pinnedAt: new Date() },
                    ],
                  }
                : g,
            ),
          );
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
    //  REMOVE from lastMessages
    setLastMessages((prev) => {
      const updated = { ...prev };
      delete updated[userId];
      return updated;
    });

    //  REMOVE from unreadCounts
    setUnreadCounts((prev) => {
      const updated = { ...prev };
      delete updated[userId];
      return updated;
    });

    // CLEAR selection if this was the selected user
    if (selectedUser?._id === userId) {
      setSelectedUser(null);
      setConversationId(null);
    }
  };

  // Add this around line 146
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

  // Initial data fetch
  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedUsername = localStorage.getItem("username");

    if (!token || !storedUsername) {
      navigate("/login");
      return;
    }

    setUsername(storedUsername);

    const fetchUsers = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/friends/list`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        //......
        setUsers(res.data);

        const payload = JSON.parse(atob(token.split(".")[1]));
        setCurrentUserId(payload.id);
      } catch (err) {
        console.error(" Error fetching users:", err);
        if (err.response?.status === 401) {
          localStorage.clear();
          navigate("/login");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [navigate]);

  useEffect(() => {
    const loadGroups = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(`${API_BASE_URL}/api/groups/list`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setGroups(response.data);
      } catch (err) {
        console.error("Failed to load groups:", err);
      }
    };

    if (currentUserId) {
      loadGroups();
    }
  }, [currentUserId]);

  // Load last messages for all users on mount
  useEffect(() => {
    if (!currentUserId || (users.length === 0 && groups.length === 0)) return;

    const loadLastMessages = async () => {
      try {
        const token = localStorage.getItem("token");

        // Users ke liye
        // Users ke liye
        for (const user of users) {
          const convRes = await axios.post(
            `${API_BASE_URL}/api/messages/conversation`,
            { otherUserId: user._id },
            { headers: { Authorization: `Bearer ${token}` } },
          );

          const conversationId = convRes.data._id;

          const msgRes = await axios.get(
            `${API_BASE_URL}/api/messages/${conversationId}`,
            { headers: { Authorization: `Bearer ${token}` } },
          );

          const messages = msgRes.data;

          //  ALWAYS set lastMessage entry (even if empty)
          if (messages.length > 0) {
            const lastMsg = messages[messages.length - 1];

            const messageText =
              lastMsg.text ||
              (lastMsg.attachments?.length > 0
                ? formatAttachmentText(lastMsg.attachments)
                : "");

            setLastMessages((prev) => ({
              ...prev,
              [user._id]: {
                text: messageText,
                time: lastMsg.createdAt,
                sender: lastMsg.sender._id || lastMsg.sender,
                status: lastMsg.status || "sent",
                lastMessageId: lastMsg._id,
                conversationId: conversationId,
                attachments: lastMsg.attachments,
                _updated: Date.now(),
              },
            }));

            const unreadCount = messages.filter(
              (msg) =>
                msg.sender._id !== currentUserId && msg.status !== "read",
            ).length;

            if (unreadCount > 0) {
              setUnreadCounts((prev) => ({
                ...prev,
                [user._id]: unreadCount,
              }));
            }
          } else {
            setLastMessages((prev) => ({
              ...prev,
              [user._id]: {
                text: "",
                time: null,
                sender: null,
                status: "sent",
                lastMessageId: null,
                conversationId: conversationId,
                attachments: [],
                _updated: Date.now(),
              },
            }));
          }
        }

        // Groups
        for (const group of groups) {
          try {
            const msgRes = await axios.get(
              `${API_BASE_URL}/api/messages/group/${group._id}`,
              { headers: { Authorization: `Bearer ${token}` } },
            );

            const messages = msgRes.data;
            if (messages.length > 0) {
              const lastMsg = messages[messages.length - 1];

              const messageText =
                lastMsg.text ||
                (lastMsg.attachments?.length > 0
                  ? formatAttachmentText(lastMsg.attachments)
                  : "");

              setLastMessages((prev) => ({
                ...prev,
                [group._id]: {
                  text: messageText,
                  time: lastMsg.createdAt,
                  sender: lastMsg.sender._id || lastMsg.sender,
                  status: lastMsg.status || "sent",
                  lastMessageId: lastMsg._id,
                  conversationId: group._id,
                  attachments: lastMsg.attachments,
                  _updated: Date.now(),
                  isGroup: true,
                },
              }));
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
  }, [currentUserId, users, groups]);
  useEffect(() => {
    if (!socket || !currentUserId) return;

    const handleNewMessage = (msg) => {
      const senderId = msg.sender?._id || msg.sender;
      const receiverId = msg.receiver;

      const messageText =
        msg.text ||
        (msg.attachments?.length > 0
          ? formatAttachmentText(msg.attachments)
          : "");
      // Check if message is from a group
      if (msg.groupId) {
        setLastMessages((prev) => ({
          ...prev,
          [msg.groupId]: {
            text: messageText,
            time: msg.createdAt || new Date().toISOString(),
            sender: senderId,
            status: msg.status || "sent",
            conversationId: msg.groupId,
            lastMessageId: msg._id,
            attachments: msg.attachments,
            _updated: Date.now(),
            isGroup: true,
          },
        }));
      } else {
        // Individual message
        const associatedUserId =
          senderId === currentUserId ? receiverId : senderId;

        setLastMessages((prev) => ({
          ...prev,
          [associatedUserId]: {
            text: messageText,
            time: msg.createdAt || new Date().toISOString(),
            sender: senderId,
            status: msg.status || "sent",
            conversationId: msg.conversationId,
            lastMessageId: msg._id,
            attachments: msg.attachments,
            _updated: Date.now(),
          },
        }));

        if (
          senderId !== currentUserId &&
          selectedUserRef.current?._id !== senderId
        ) {
          setUnreadCounts((prev) => ({
            ...prev,
            [senderId]: (prev[senderId] || 0) + 1,
          }));
        }
      }
    };

    const handleStatusUpdate = ({ messageId, _id, status, conversationId }) => {
      const msgId = messageId || _id;

      if (!status || !conversationId) {
        console.warn(" Invalid status update");
        return;
      }

      setLastMessages((prev) => {
        let targetUserId = null;

        for (const [userId, msgData] of Object.entries(prev)) {
          if (msgData?.conversationId === conversationId) {
            targetUserId = userId;
            break;
          }
        }

        if (!targetUserId) {
          return prev;
        }

        const newState = {
          ...prev,
          [targetUserId]: {
            ...prev[targetUserId],
            status: status,
            _updated: Date.now(),
          },
        };

        return newState;
      });
    };

    const handleMessageDeleted = async (data) => {
      console.log(" Message deleted (ignored for clear chat):", data);
      // Do nothing - clear chat will reload page, delete conversation uses different flow
    };
    const handleMessageDeletedForEveryone = async (data) => {
      console.log("Message deleted for everyone:", data);

      if (data.messageId && data.conversationId) {
        try {
          // Fetch messages to find previous one
          const token = localStorage.getItem("token");
          const response = await axios.get(
            `${API_BASE_URL}/api/messages/${data.conversationId}`,
            { headers: { Authorization: `Bearer ${token}` } },
          );

          // Filter out deleted message
          const messages = response.data.filter(
            (msg) => msg._id !== data.messageId && !msg.deletedForEveryone,
          );
          const previousMessage = messages[messages.length - 1];

          setLastMessages((prev) => {
            const updated = { ...prev };

            for (const [userId, msgData] of Object.entries(prev)) {
              if (msgData?.conversationId === data.conversationId) {
                if (previousMessage) {
                  //  Show previous message
                  const messageText =
                    previousMessage.text ||
                    (previousMessage.attachments?.length > 0
                      ? formatAttachmentText(previousMessage.attachments)
                      : "");

                  updated[userId] = {
                    ...msgData,
                    text: messageText,
                    lastMessageId: previousMessage._id,
                    time: previousMessage.createdAt,
                    sender:
                      previousMessage.sender._id || previousMessage.sender,
                    status: previousMessage.status || "sent",
                    _updated: Date.now(),
                  };
                } else {
                  // No messages left
                  updated[userId] = {
                    ...msgData,
                    text: "",
                    lastMessageId: null,
                    _updated: Date.now(),
                  };
                }
                break;
              }
            }

            return updated;
          });
        } catch (err) {
          console.error(" Error fetching previous message:", err);
        }
      }
    };

    //  GROUP MESSAGE LISTENER
    socket.on("receiveGroupMessage", (msg) => {
      console.log(" Group msg received:", msg);

      if (msg.groupId) {
        const messageText = msg.text || formatAttachmentText(msg.attachments);

        setLastMessages((prev) => ({
          ...prev,
          [msg.groupId]: {
            text: messageText,
            time: msg.createdAt || new Date().toISOString(),
            sender: msg.sender._id || msg.sender,
            status: msg.status || "sent",
            conversationId: msg.groupId,
            lastMessageId: msg._id,
            attachments: msg.attachments,
            _updated: Date.now(),
            isGroup: true,
          },
        }));
      }
    });

    // Socket listeners for status updates
    socket.on("newStatus", (data) => {
      console.log(" New status received:", data);

      // Reload all statuses to get fresh data
      const loadStatuses = async () => {
        try {
          const token = localStorage.getItem("token");
          const response = await axios.get("http://localhost:5000/api/status", {
            headers: { Authorization: `Bearer ${token}` },
          });
          setAllStatuses(response.data);
        } catch (err) {
          console.error("Reload statuses error:", err);
        }
      };
      loadStatuses();
    });

    // Real-time status view updates
    socket.on("statusViewed", (data) => {
      console.log(" Status viewed:", data);

      setAllStatuses((prev) => {
        return prev.map((userStatus) => ({
          ...userStatus,
          statuses: userStatus.statuses.map((status) => {
            if (status._id === data.statusId) {
              return {
                ...status,
                viewedBy: [
                  ...status.viewedBy,
                  {
                    userId: { _id: data.viewerId },
                    viewedAt: data.viewedAt,
                  },
                ],
              };
            }
            return status;
          }),
        }));
      });
    });
    socket.on("receiveMessage", handleNewMessage);
    socket.on("messageStatusUpdate", handleStatusUpdate);
    // socket.on("messageDeleted", handleMessageDeleted);
    socket.on("messageDeletedForEveryone", handleMessageDeletedForEveryone);

    return () => {
      socket.off("receiveGroupMessage");
      socket.off("receiveMessage", handleNewMessage);
      socket.off("messageStatusUpdate", handleStatusUpdate);
      socket.off("messageDeleted", handleMessageDeleted);
      socket.off("messageDeletedForEveryone", handleMessageDeletedForEveryone);
      socket.off("newStatus");
      socket.off("statusDeleted");
      socket.off("statusViewed");
    };
  }, [socket, currentUserId]);
  // Get conversation
  useEffect(() => {
    if (!selectedUser || !selectedUser._id) {
      setConversationId(null);
      return;
    }

    const getConversation = async () => {
      try {
        const token = localStorage.getItem("token");

        const res = await axios.post(
          "http://localhost:5000/api/messages/conversation",
          { otherUserId: selectedUser._id },
          { headers: { Authorization: `Bearer ${token}` } },
        );

        setConversationId(res.data._id);

        setUnreadCounts((prev) => ({
          ...prev,
          [selectedUser._id]: 0,
        }));

        if (socket) {
          socket.emit("markAsRead", { conversationId: res.data._id });
        }
      } catch (err) {
        console.error(" Get conversation error:", err);
      }
    };

    getConversation();
  }, [selectedUser?._id, socket]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    if (socket) socket.disconnect();
    navigate("/login", { replace: true });
  };
  const handleClearChat = async () => {
    try {
      const token = localStorage.getItem("token");

      if (!conversationId) {
        console.error(" No conversationId!");
        return;
      }

      await axios.patch(
        `${API_BASE_URL}/api/messages/conversation/${conversationId}/clear`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );

      setAlertDialog({
        isOpen: true,
        title: "Chat Cleared!",
        message: "Messages deleted. Chat still in list.",
        type: "success",
      });

      //  Update lastMessages to empty but KEEP conversationId
      setLastMessages((prev) => ({
        ...prev,
        [selectedUser?._id]: {
          text: "",
          time: new Date().toISOString(),
          sender: null,
          status: "sent",
          lastMessageId: null,
          conversationId: conversationId,
          attachments: [],
          _updated: Date.now(),
        },
      }));

      // DON'T reload - just close dialog
      setClearChatDialog({ isOpen: false, username: "" });
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
        const token = localStorage.getItem("token");
        const response = await axios.get("http://localhost:5000/api/status", {
          headers: { Authorization: `Bearer ${token}` },
        });
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
          users={users}
          groups={groups}
          selectedUserId={selectedUser?._id}
          onSelectUser={(user) => {
            if (user.isGroup) {
              // Group selected
              setSelectedGroup(user);
              setSelectedUser(null);
              setIsGroupChat(true);
              setConversationId(null);
            } else {
              // Individual user selected
              setSelectedUser(user);
              setSelectedGroup(null);
              setIsGroupChat(false);
            }

            setIsMobileSidebarOpen(false);
          }}
          onlineUsers={onlineUsers}
          currentUsername={username}
          currentUserId={currentUserId}
          onLogout={handleLogout}
          unreadCounts={unreadCounts}
          lastMessages={lastMessages}
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
            setGroups((prev) => {
              const updated = prev.map((g) =>
                g._id === updatedGroup._id ? updatedGroup : g,
              );
              return updated;
            });
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
                    onUpdateLastMessageStatus={(updateData) => {
                      if (
                        updateData &&
                        updateData.status &&
                        updateData.conversationId
                      ) {
                        setLastMessages((prev) => {
                          let targetUserId = null;
                          for (const [userId, msgData] of Object.entries(
                            prev,
                          )) {
                            if (
                              msgData?.conversationId ===
                              updateData.conversationId
                            ) {
                              targetUserId = userId;
                              break;
                            }
                          }
                          if (!targetUserId) return prev;
                          return {
                            ...prev,
                            [targetUserId]: {
                              ...prev[targetUserId],
                              status: updateData.status,
                              _updated: Date.now(),
                            },
                          };
                        });
                      }
                    }}
                  />
                  <MessageInput conversationId={conversationId} />
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
