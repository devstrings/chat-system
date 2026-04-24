import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ChatWindow from "@/pages/Conversation/components/ChatWindow";
import { useWebRTC } from "@/hooks/useWebRTC";
import VideoCall from "@/components/Call/VideoCall";
import IncomingCall from "@/components/Call/IncomingCall";
import MessageInput from "@/pages/Conversation/components/MessageInput";
import ConfirmationDialog from "@/components/base/ConfirmationDialog";
import { useAuthImage } from "@/hooks/useAuthImage";
import GroupChatWindow from "@/components/Group/GroupChatWindow";
import StatusManager from "@/components/Status/StatusManager";
import StatusViewer from "@/components/Status/StatusViewer";
import NotificationToast from "@/pages/Conversation/components/NotificationToast";
import useConversationNotifications from "@/pages/Conversation/hooks/useConversationNotifications";
import useConversationSocketListeners from "@/pages/Conversation/hooks/useConversationSocketListeners";
import { decryptMessageHelper } from "@/utils/cryptoUtils";
import { useDispatch, useSelector } from "react-redux";
import AlertDialog from "@/components/base/AlertDialog";
import {
  fetchFriendsList,
} from "@/store/slices/userSlice";
import { fetchGroups } from "@/store/slices/groupSlice";
import {
  fetchConversation,
  clearUnreadCount,
  addMessage,
  incrementUnreadCount,
  decryptAndStoreSharedKey
} from "@/store/slices/chatSlice";
import apiActions from "@/store/apiActions";
import {
  clearChatMessages,
  loadGroupLastMessages,
  requestNotificationPermission,
  registerServiceWorker,
} from "@/actions/dashboard.actions";
export default function Conversation({ onOpenMobileSidebar = () => {} }) {
  const [selectedUser, setSelectedUser] = useState(null);
  const [savedSelectedUserId] = useState(
    () => localStorage.getItem("selectedUserId") || null,
  );
  //   const [conversationId, setConversationId] = useState(null);
  const { conversationId: urlConversationId } = useParams();
  const [conversationId, setConversationId] = useState(null);
  const socket = useSelector((state) => state.socket.socket);

  const onlineUsers = useSelector((state) => state.socket.onlineUsers);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [replyTo, setReplyTo] = useState(null);
  // Redux state
  const { currentUserId } = useSelector((state) => state.auth);
  const { friends: users } = useSelector((state) => state.user);
  const { groups } = useSelector((state) => state.group);
  const { lastMessages, sharedKeys } = useSelector((state) => state.chat);
  const [loading, setLoading] = useState(true);

  const [showChatMenu, setShowChatMenu] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const {
    startCall,
    answerCall,
    endCall,
    localStream,
    remoteStream,
    isMuted,
    isVideoOff,
    receiverOnline,
    toggleMute,
    toggleVideo,
  } = useWebRTC();

  const [showVideoCall, setShowVideoCall] = useState(false);
  const [activeCall, setActiveCall] = useState(null);
  const [searchInChat, setSearchInChat] = useState("");
  const [showSearchBox, setShowSearchBox] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState(new Set());

  const selectedUserRef = useRef(null);
  const hasInitialized = useRef(false);
  const lastMessagesRef = useRef({});
  const hasRestored = useRef(false);
  const hasLoadedUserMessages = useRef(false);
  const hasLoadedGroupMessages = useRef(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [savedSelectedGroupId] = useState(
    () => localStorage.getItem("selectedGroupId") || null,
  );
  const [isGroupChat, setIsGroupChat] = useState(() => {
    const savedGroupId = localStorage.getItem("selectedGroupId");
    const savedIsGroupChat = localStorage.getItem("isGroupChat") === "true";
    return savedGroupId && savedIsGroupChat;
  });

  const { imageSrc: selectedGroupImage } = useAuthImage(
    isGroupChat ? selectedGroup?.groupImage : null,
    "group",
  );
  // Clear chat dialog state
  const [clearChatDialog, setClearChatDialog] = useState({
    isOpen: false,
    username: "",
  });

  const {
    toastNotifications,
    setToastNotifications,
    showNotification,
    handleToastSelect,
  } = useConversationNotifications({
    users,
    groups,
    setSelectedUser,
    setSelectedGroup,
    setIsGroupChat,
    setConversationId,
    navigate,
  });

  const [alertDialog, setAlertDialog] = useState({
    isOpen: false,
    title: "",
    message: "",
    type: "info",
  });

  useConversationSocketListeners({
    socket,
    currentUserId,
    dispatch,
    sharedKeys,
    showNotification,
    isGroupChat,
    selectedGroupId: selectedGroup?._id,
    selectedUserRef,
    lastMessagesRef,
  });

  useEffect(() => {
    selectedUserRef.current = selectedUser;
  }, [selectedUser]);
  useEffect(() => {
    if (selectedUser?._id) {
      localStorage.setItem("selectedUserId", selectedUser._id);
      console.log(" Saved selectedUserId:", selectedUser._id);
    }
  }, [selectedUser]);
  useEffect(() => {
    if (selectedGroup?._id) {
      localStorage.setItem("selectedGroupId", selectedGroup._id);
      localStorage.setItem("isGroupChat", "true");
      console.log(" Saved selectedGroupId:", selectedGroup._id);
    } else {
      localStorage.removeItem("isGroupChat");
    }
  }, [selectedGroup]);
  useEffect(() => {
    requestNotificationPermission();
    registerServiceWorker();
  }, []);
  useEffect(() => {
    lastMessagesRef.current = lastMessages;
  }, [lastMessages]);

  const { imageSrc: selectedUserImage } = useAuthImage(
    selectedUser?.profileImage,
  );

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
    if (loading) return;
    if (hasRestored.current) return;
    if (!savedSelectedUserId && !savedSelectedGroupId) return;
    if (users.length === 0 && groups.length === 0) return;

    if (savedSelectedGroupId && isGroupChat) {
      const group = groups.find((g) => g._id === savedSelectedGroupId);
      if (group) {
        setSelectedGroup(group);
        setIsGroupChat(true);
        hasRestored.current = true;
      }
    } else if (savedSelectedUserId) {
      const user = users.find((u) => u._id === savedSelectedUserId);
      if (user) {
        setSelectedUser(user);
        setIsGroupChat(false);
        hasRestored.current = true;
      }
    }
  }, [users, groups, loading]);
  useEffect(() => {
    if (loading) return;
    if (!urlConversationId || urlConversationId === "home") {
      setSelectedUser(null);
      setSelectedGroup(null);
      return;
    }

    // 1. Try resolving as a Group ID
    const group = groups.find((g) => g._id === urlConversationId);
    if (group) {
      setSelectedGroup(group);
      setIsGroupChat(true);
      setSelectedUser(null);
      setConversationId(urlConversationId);
      return;
    }

    // 2. Try resolving as a Conversation ID (Lookup via lastMessages)
    const userIdFromConvo = Object.keys(lastMessages).find(
      (uid) => lastMessages[uid]?.conversationId === urlConversationId,
    );
    if (userIdFromConvo) {
      const user = users.find((u) => u._id === userIdFromConvo);
      if (user) {
        setSelectedUser(user);
        setIsGroupChat(false);
        setSelectedGroup(null);
        // setConversationId(urlConversationId);
        return;
      }
    }

    // 3. Fallback: Try resolving as a direct User ID (for manual entry/bookmarks)
    const userDirect = users.find((u) => u._id === urlConversationId);
    if (userDirect) {
      setSelectedUser(userDirect);
      setIsGroupChat(false);
      setSelectedGroup(null);
    }
  }, [urlConversationId, users, groups, loading, lastMessages]);

  // USERS MESSAGES LOAD
  useEffect(() => {
    if (!currentUserId || users.length === 0) return;
    if (hasLoadedUserMessages.current) return;
    hasLoadedUserMessages.current = true;

    const loadUserMessages = async () => {
      for (const user of users) {
        try {
          const convRes = await apiActions.getConversation(user._id, true);
          if (!convRes) continue;
          if (
            convRes?.deletedBy?.some(
              (d) => d.userId?.toString() === currentUserId?.toString(),
            )
          )
            continue;

          let activeSharedKey = sharedKeys[convRes._id];
          if (convRes.sharedEncryptedKeys && !activeSharedKey) {
            try {
              const result = await dispatch(
                decryptAndStoreSharedKey({
                  conversationId: convRes._id,
                  sharedEncryptedKeys: convRes.sharedEncryptedKeys,
                  currentUserId,
                }),
              ).unwrap();
              activeSharedKey = result.sharedKey;
            } catch (err) {
              console.error("Failed to decrypt key:", err);
            }
          }

          const msgRes = await apiActions.getPaginatedConversationMessagesById(
            convRes._id,
            1,
            20,
          );
          const messages = await Promise.all(
            msgRes.map(async (msg) => {
              msg.text = await decryptMessageHelper(
                msg,
                currentUserId,
                activeSharedKey,
              );
              return msg;
            }),
          );
          const visibleMessages = messages.filter(
            (msg) => !msg.deletedFor?.includes(currentUserId),
          );

          if (visibleMessages.length > 0) {
            const lastMsg = visibleMessages[visibleMessages.length - 1];
            const messageTimestamp = new Date(lastMsg.createdAt).getTime();
            let processedMsg = { ...lastMsg };
            if (lastMsg.isCallRecord) {
              const icon = lastMsg.callType === "video" ? "📹" : "📞";
              processedMsg.text =
                lastMsg.callStatus === "missed"
                  ? `${icon} Missed Call`
                  : lastMsg.callStatus === "rejected"
                    ? `${icon} Call Declined`
                    : lastMsg.callStatus === "cancelled"
                      ? `${icon} Cancelled`
                      : lastMsg.callDuration > 0
                        ? `${icon} ${lastMsg.callDuration}s`
                        : `${icon} Call`;
            }
            dispatch(
              addMessage({
                conversationId: convRes._id,
                message: {
                  ...processedMsg,
                  _loadedTimestamp: messageTimestamp,
                },
                userId: user._id,
                isGroup: false,
              }),
            );

            const unreadCount = messages.filter(
              (msg) =>
                msg.sender._id !== currentUserId && msg.status !== "read",
            ).length;
            const isCurrentlyOpen = selectedUserRef.current?._id === user._id;
            if (unreadCount > 0 && !isCurrentlyOpen) {
              for (let i = 0; i < unreadCount; i++)
                dispatch(incrementUnreadCount(user._id));
            } else if (isCurrentlyOpen) {
              dispatch(clearUnreadCount(user._id));
            }
          } else {
            dispatch(
              addMessage({
                conversationId: convRes._id,
                message: {
                  _id: `conv-placeholder-${convRes._id}`,
                  text: "",
                  createdAt: new Date().toISOString(),
                  sender: currentUserId,
                  status: "sent",
                  attachments: [],
                  isPlaceholder: true,
                },
                userId: user._id,
                isGroup: false,
              }),
            );
          }
        } catch (userErr) {
          if (userErr.response?.status === 404) continue;
          console.error(
            `Error loading messages for user ${user._id}:`,
            userErr,
          );
        }
      }
    };
    loadUserMessages();
  }, [currentUserId, users, dispatch]);

  // GROUPS MESSAGES LOAD
  useEffect(() => {
    if (!currentUserId || groups.length === 0) return;
    if (hasLoadedGroupMessages.current) return;
    hasLoadedGroupMessages.current = true;

    const loadGroupMessages = async () => {
      for (const group of groups) {
        try {
          console.log(
            "Group load:",
            group._id,
            "targetKey will be:",
            `group_${group._id}`,
          );
          const result = await loadGroupLastMessages(group._id, currentUserId);
          const messages = result.messages;
          console.log("Group messages count:", messages.length);

          if (messages.length > 0) {
            const lastMsg = messages[messages.length - 1];
            const messageTimestamp = new Date(lastMsg.createdAt).getTime();
            let processedMsg = { ...lastMsg };
            if (lastMsg.isCallRecord) {
              const icon = lastMsg.callType === "video" ? "📹" : "📞";
              processedMsg.text =
                lastMsg.callStatus === "missed"
                  ? `${icon} Missed Call`
                  : lastMsg.callStatus === "rejected"
                    ? `${icon} Call Declined`
                    : lastMsg.callStatus === "cancelled"
                      ? `${icon} Cancelled`
                      : lastMsg.callDuration > 0
                        ? `${icon} ${lastMsg.callDuration}s`
                        : `${icon} Call`;
            }
            dispatch(
              addMessage({
                conversationId: group._id,
                message: {
                  ...processedMsg,
                  _loadedTimestamp: messageTimestamp,
                },
                userId: group._id,
                isGroup: true,
              }),
            );
          } else {
            dispatch(
              addMessage({
                conversationId: group._id,
                message: {
                  _id: `group-placeholder-${group._id}`,
                  text: "",
                  createdAt: group.createdAt || new Date().toISOString(),
                  sender: currentUserId,
                  status: "sent",
                  attachments: [],
                  isPlaceholder: true,
                },
                userId: group._id,
                isGroup: true,
              }),
            );
          }
        } catch (err) {
          console.error(`Error loading messages for group ${group._id}:`, err);
        }
      }
    };
    loadGroupMessages();
  }, [currentUserId, groups, dispatch]);
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

    setConversationId(null);

    const getConversation = async () => {
      try {
        const result = await dispatch(
          fetchConversation({ otherUserId: selectedUser._id }),
        ).unwrap();

        setConversationId(result._id);
        dispatch(clearUnreadCount(selectedUser._id));
        dispatch({ type: "chat/setSelectedUserId", payload: selectedUser._id });

        if (urlConversationId === selectedUser._id) {
          navigate(`/conversation/${result._id}`, { replace: true });
        }

     if (socket) {
          socket.emit("markAsRead", { conversationId: result._id });
        }
      } catch (err) {
        console.error("Get conversation error:", err);
        setConversationId(null);
      }
    };

    getConversation();
  }, [selectedUser?._id, socket, dispatch, navigate, urlConversationId]);
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

  const handleClearChat = async () => {
    try {
      if (!conversationId) {
        console.error(" No conversationId!");
        return;
      }

      console.log(" Clearing chat for conversation:", conversationId);

      await clearChatMessages(conversationId);

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

  return (
    <>
      <div className="flex h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 overflow-hidden">
        {/* Status Manager Modal */}

        <div className="flex-1 flex flex-col min-w-0 bg-gray-50">
          {selectedUser || selectedGroup ? (
            <>
              <div className="bg-white border-b border-gray-200 px-3 md:px-6 py-3 md:py-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
                    {/* HAMBURGER MENU (MOBILE ONLY) */}
                    <button
                      onClick={onOpenMobileSidebar}
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
                        ) : onlineUsers.includes(selectedUser._id) ? (
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
                    {/* CALL BUTTONS - */}
                    {!isGroupChat && selectedUser && (
                      <>
                        <button
                          onClick={() => {
                            if (!socket) {
                              alert("Not connected. Please refresh.");
                              return;
                            }
                            console.log("Calling:", selectedUser._id);
                            startCall(selectedUser._id, "audio");
                            setActiveCall({
                              user: selectedUser,
                              type: "audio",
                            });
                            setShowVideoCall(true);
                          }}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-green-600"
                          title="Voice Call"
                        >
                          <svg
                            className="w-5 h-5"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => {
                            if (!socket) {
                              alert("Not connected. Please refresh.");
                              return;
                            }
                            console.log(" Video calling:", selectedUser._id);
                            startCall(selectedUser._id, "video");
                            setActiveCall({
                              user: selectedUser,
                              type: "video",
                            });
                            setShowVideoCall(true);
                          }}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-blue-600"
                          title="Video Call"
                        >
                          <svg
                            className="w-5 h-5"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                          </svg>
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => setIsSelectionMode(!isSelectionMode)}
                      className={`p-2 hover:bg-gray-100 rounded-lg transition-colors ${isSelectionMode ? "text-blue-600" : "text-black"}`}
                      title="Select Messages"
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
                          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                        />
                      </svg>
                    </button>
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
                                  setShowUserProfile(true);
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
                    <button
                      onClick={() => {
                        setSearchInChat("");
                        setShowSearchBox(false);
                      }}
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
                    isSelectionMode={isSelectionMode}
                    setIsSelectionMode={setIsSelectionMode}
                    selectedMessages={selectedMessages}
                    setSelectedMessages={setSelectedMessages}
                    onReply={(msg) => setReplyTo(msg)}
                  />
                  <MessageInput
                    groupId={selectedGroup._id}
                    isGroup={true}
                    replyTo={replyTo}
                    onCancelReply={() => setReplyTo(null)}
                  />
                </>
              ) : (
                <>
                  {!selectedUser ? (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-center text-gray-400 text-sm">
                        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                        Loading...
                      </div>
                    </div>
                  ) : !conversationId ? (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-center text-gray-400 text-sm">
                        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                        Initializing conversation...
                      </div>
                    </div>
                  ) : (
                    <>
                      <ChatWindow
                        conversationId={conversationId}
                        currentUserId={currentUserId}
                        searchQuery={searchInChat}
                        selectedUser={selectedUser}
                        onUpdateLastMessageStatus={(updateData) => {}}
                        isSelectionMode={isSelectionMode}
                        setIsSelectionMode={setIsSelectionMode}
                        selectedMessages={selectedMessages}
                        setSelectedMessages={setSelectedMessages}
                        onReply={(msg) => setReplyTo(msg)}
                      />
                      <MessageInput
                        conversationId={conversationId}
                        selectedUser={selectedUser}
                        isGroup={false}
                        replyTo={replyTo}
                        onCancelReply={() => setReplyTo(null)}
                      />
                    </>
                  )}
                </>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-4 bg-gray-50">
              <div className="text-center">
                <button
                  onClick={onOpenMobileSidebar}
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
                <h3 className="text-xl md:text-2xl font-semibold text-gray-800 mb-2">
                  Welcome to Chat System
                </h3>
                <p className="text-sm md:text-base text-gray-500">
                  Select a conversation to start messaging
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Video Call Modal */}
      {showVideoCall && activeCall && (
        <VideoCall
          remoteUser={activeCall.user}
          callType={activeCall.type}
          localStream={localStream}
          remoteStream={remoteStream}
          isMuted={isMuted}
          isVideoOff={isVideoOff}
          receiverOnline={receiverOnline}
          onToggleMute={toggleMute}
          onToggleVideo={toggleVideo}
          onEndCall={() => {
            endCall();
            setShowVideoCall(false);
            setActiveCall(null);
          }}
          onClose={() => {
            setShowVideoCall(false);
            setActiveCall(null);
          }}
          onCallRejected={() => {
            setShowVideoCall(false);
            setActiveCall(null);
          }}
        />
      )}
      {/* Incoming Call */}
      <IncomingCall
        answerCall={answerCall}
        onCallAccepted={(callData) => {
          setActiveCall({
            user: callData.callerInfo,
            type: callData.callType,
          });
          setShowVideoCall(true);
        }}
        onCallEnded={() => {
          setShowVideoCall(false);
          setActiveCall(null);
        }}
        onCallRejected={() => {
          setShowVideoCall(false);
          setActiveCall(null);
        }}
      />
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

      {showUserProfile && selectedUser && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="fixed inset-0 bg-black/30"
            onClick={() => setShowUserProfile(false)}
          />
          <div className="relative w-80 h-full bg-white shadow-2xl flex flex-col">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-4 flex items-center gap-3">
              <button
                onClick={() => setShowUserProfile(false)}
                className="text-white p-1 hover:bg-white/20 rounded-full"
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
              <h2 className="text-white font-semibold text-lg">Contact Info</h2>
            </div>
            <div className="flex flex-col items-center py-8 px-4 bg-gray-50 border-b">
              <div className="w-24 h-24 rounded-full overflow-hidden shadow-lg mb-3">
                {selectedUserImage || selectedUser?.profileImage ? (
                  <img
                    src={selectedUserImage || selectedUser?.profileImage}
                    className="w-full h-full object-cover"
                    alt={selectedUser?.username}
                    crossOrigin="anonymous"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white text-3xl font-bold">
                    {selectedUser?.username?.charAt(0)?.toUpperCase()}
                  </div>
                )}
              </div>
              <h3 className="text-xl font-bold text-gray-900">
                {selectedUser?.username}
              </h3>
              <div className="flex items-center gap-1 mt-1">
                <span
                  className={`w-2 h-2 rounded-full ${onlineUsers.includes(selectedUser?._id) ? "bg-green-500" : "bg-gray-400"}`}
                ></span>
                <span className="text-sm text-gray-500">
                  {onlineUsers.includes(selectedUser?._id)
                    ? "Online"
                    : "Offline"}
                </span>
              </div>
            </div>
            <div className="flex-1 p-4 space-y-3 overflow-y-auto">
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="text-xs text-gray-500 uppercase font-semibold mb-1">
                  Email
                </p>
                <p className="text-gray-900 text-sm">
                  {selectedUser?.email || "N/A"}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="text-xs text-gray-500 uppercase font-semibold mb-1">
                  Status
                </p>
                <p
                  className={`text-sm font-medium ${onlineUsers.includes(selectedUser?._id) ? "text-green-600" : "text-gray-500"}`}
                >
                  {onlineUsers.includes(selectedUser?._id)
                    ? "🟢 Active now"
                    : "⚫ Offline"}
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="text-xs text-gray-500 uppercase font-semibold mb-1">
                  Member Since
                </p>
                <p className="text-gray-900 text-sm">
                  {selectedUser?.createdAt
                    ? new Date(selectedUser.createdAt).toLocaleDateString(
                        "en-US",
                        { year: "numeric", month: "long", day: "numeric" },
                      )
                    : "N/A"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <AlertDialog
        isOpen={alertDialog.isOpen}
        onClose={() => setAlertDialog({ ...alertDialog, isOpen: false })}
        title={alertDialog.title}
        message={alertDialog.message}
        type={alertDialog.type}
      />

      <NotificationToast
        notifications={toastNotifications}
        onClose={(id) => {
          setToastNotifications((prev) => prev.filter((n) => n.id !== id));
        }}
        onSelect={handleToastSelect}
      />
    </>
  );
}
