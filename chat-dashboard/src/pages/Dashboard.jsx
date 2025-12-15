import { useEffect, useState, useRef } from "react";
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

export default function Dashboard() {
  const navigate = useNavigate();
  const { socket, onlineUsers } = useSocket();
  const [username, setUsername] = useState("");
  const [currentUserId, setCurrentUserId] = useState("");
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [conversationId, setConversationId] = useState(null);
  // const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [searchInChat, setSearchInChat] = useState("");
  const [showSearchBox, setShowSearchBox] = useState(false);

  const [unreadCounts, setUnreadCounts] = useState({});
  const [lastMessages, setLastMessages] = useState({});

  const selectedUserRef = useRef(null);

  //  MOBILE SIDEBAR STATE
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  // Profile Picture States
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [profileImage, setProfileImage] = useState(
    localStorage.getItem("profileImage") || ""
  );
  const [imageInput, setImageInput] = useState("");

  // Dialog states
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

  useEffect(() => {
    selectedUserRef.current = selectedUser;
  }, [selectedUser]);

  const { imageSrc: selectedUserImage } = useAuthImage(
    selectedUser?.profileImage
  );
  const handleRemoveProfileImage = async () => {
    try {
      const token = localStorage.getItem("token");
      await axios.delete(
        "http://localhost:5000/api/users/profile/remove-image",
        { headers: { Authorization: `Bearer ${token}` } }
      );

      localStorage.removeItem("profileImage");
      setProfileImage("");
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

  // Helper function to format attachment text
  const formatAttachmentText = (attachments) => {
    if (!attachments || attachments.length === 0) return "";

    const file = attachments[0];
    const fileName = file.filename || file.fileName || "File";
    const fileType = file.fileType || file.type || "";

    let icon = "📎";
    if (fileType.startsWith("image/")) icon = "🖼️";
    else if (fileType.startsWith("video/")) icon = "🎥";
    else if (fileType === "application/pdf") icon = "📕";
    else if (fileType.includes("word")) icon = "📄";
    else if (fileType === "text/plain") icon = "📝";

    return `${icon} ${fileName}`;
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
        const res = await axios.get("http://localhost:5000/api/friends/list", {
          headers: { Authorization: `Bearer ${token}` },
        });
        //......
        console.log(" Fetched users from backend:", res.data);
        console.log(" First user:", res.data[0]);
        console.log(" First user profile image:", res.data[0]?.profileImage);
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

  // Load last messages for all users on mount
  useEffect(() => {
    if (!currentUserId || users.length === 0) return;

    const loadLastMessages = async () => {
      try {
        const token = localStorage.getItem("token");

        for (const user of users) {
          const convRes = await axios.post(
            "http://localhost:5000/api/messages/conversation",
            { otherUserId: user._id },
            { headers: { Authorization: `Bearer ${token}` } }
          );

          const conversationId = convRes.data._id;

          const msgRes = await axios.get(
            `http://localhost:5000/api/messages/${conversationId}`,
            { headers: { Authorization: `Bearer ${token}` } }
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
              (msg) => msg.sender._id !== currentUserId && msg.status !== "read"
            ).length;

            if (unreadCount > 0) {
              setUnreadCounts((prev) => ({
                ...prev,
                [user._id]: unreadCount,
              }));
            }
          }
        }
      } catch (err) {
        console.error(" Error loading last messages:", err);
      }
    };

    loadLastMessages();
  }, [currentUserId, users]);

  
  // useEffect(() => {
  //   if (!socket) return;

  //   socket.emit("userOnline");

  //   socket.on("onlineUsersList", ({ onlineUsers: onlineList }) => {
  //     setOnlineUsers(new Set(onlineList));
  //   });

  //   socket.on("userOnline", ({ userId, onlineUsers: onlineList }) => {
  //     if (onlineList) {
  //       setOnlineUsers(new Set(onlineList));
  //     } else {
  //       setOnlineUsers((prev) => new Set(prev).add(userId));
  //     }
  //   });

  //   socket.on("userOffline", ({ userId, onlineUsers: onlineList }) => {
  //     if (onlineList) {
  //       setOnlineUsers(new Set(onlineList));
  //     } else {
  //       setOnlineUsers((prev) => {
  //         const newSet = new Set(prev);
  //         newSet.delete(userId);
  //         return newSet;
  //       });
  //     }
  //   });

  //   return () => {
  //     socket.off("onlineUsersList");
  //     socket.off("userOnline");
  //     socket.off("userOffline");
  //   };
  // }, [socket]);

  // Listen for incoming messages and status updates
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

    socket.on("receiveMessage", handleNewMessage);
    socket.on("messageStatusUpdate", handleStatusUpdate);

    return () => {
      socket.off("receiveMessage", handleNewMessage);
      socket.off("messageStatusUpdate", handleStatusUpdate);
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
          { headers: { Authorization: `Bearer ${token}` } }
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

      setLastMessages((prev) => {
        const updated = { ...prev };
        delete updated[selectedUser._id];
        return updated;
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
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
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
          selectedUserId={selectedUser?._id}
          onSelectUser={(user) => {
            //...
            console.log(" Selected user object:", user);
            console.log(" Selected user profile image:", user.profileImage);
            setSelectedUser(user);
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
        />

        <div className="flex-1 flex flex-col min-w-0">
          {selectedUser ? (
            <>
              {/*  RESPONSIVE HEADER */}
              <div className="bg-gray-800 bg-opacity-80 border-b border-gray-700 border-opacity-50 px-3 md:px-6 py-3 md:py-4 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
                    {/*  HAMBURGER MENU (MOBILE ONLY) */}
                    <button
                      onClick={() => setIsMobileSidebarOpen(true)}
                      className="md:hidden p-2 text-gray-400 hover:text-white transition-colors flex-shrink-0"
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

                    <div className="relative flex-shrink-0">
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden shadow-lg">
                        {selectedUserImage ? (
                          <img
                            src={selectedUserImage}
                            alt={selectedUser.username}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-base md:text-lg">
                            {selectedUser.username.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      {onlineUsers.has(selectedUser._id) && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 md:w-3.5 md:h-3.5 bg-green-500 rounded-full border-2 border-gray-800 animate-pulse"></div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h2 className="text-white font-semibold text-base md:text-lg truncate">
                        {selectedUser.username}
                      </h2>
                      <p className="text-xs md:text-sm text-gray-400 flex items-center gap-1">
                        {onlineUsers.has(selectedUser._id) ? (
                          <>
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                            Online
                          </>
                        ) : (
                          <>
                            <span className="w-2 h-2 bg-gray-500 rounded-full"></span>
                            Offline
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 md:gap-2 relative">
                    <button
                      onClick={() => setShowSearchBox(!showSearchBox)}
                      className="p-2 hover:bg-gray-700 hover:bg-opacity-50 rounded-lg transition-colors text-gray-400 hover:text-white"
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

                    <div className="relative">
                      <button
                        onClick={() => setShowChatMenu(!showChatMenu)}
                        className="p-2 hover:bg-gray-700 hover:bg-opacity-50 rounded-lg transition-colors text-gray-400 hover:text-white"
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
                          <div className="absolute right-0 mt-2 w-52 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-20 overflow-hidden">
                            <button
                              onClick={() => {
                                setAlertDialog({
                                  isOpen: true,
                                  title: "User Info",
                                  message: `👤 ${selectedUser.username}\n📧 ${
                                    selectedUser.email
                                  }\n${
                                    onlineUsers.has(selectedUser._id)
                                      ? "🟢 Online"
                                      : "⚫ Offline"
                                  }`,
                                  type: "info",
                                });
                                setShowChatMenu(false);
                              }}
                              className="w-full px-4 py-3 text-left text-gray-200 hover:bg-gray-700 transition-colors flex items-center gap-3 text-sm"
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

                            <button
                              onClick={() => {
                                setClearChatDialog({
                                  isOpen: true,
                                  username: selectedUser.username,
                                });
                                setShowChatMenu(false);
                              }}
                              className="w-full px-4 py-3 text-left text-red-400 hover:bg-gray-700 transition-colors flex items-center gap-3 text-sm border-t border-gray-700"
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
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {showSearchBox && (
                  <div className="mt-3 relative">
                    <input
                      type="text"
                      placeholder="Search in messages..."
                      value={searchInChat}
                      onChange={(e) => setSearchInChat(e.target.value)}
                      className="w-full pl-10 pr-10 py-2 bg-gray-700 bg-opacity-50 border border-gray-600 rounded-lg text-gray-200 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
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
                        className="absolute right-3 top-3 text-gray-400 hover:text-gray-200 transition-colors"
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

                      for (const [userId, msgData] of Object.entries(prev)) {
                        if (
                          msgData?.conversationId === updateData.conversationId
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
          ) : (
            <div className="flex-1 flex items-center justify-center p-4">
              <div className="text-center">
                {/*  MOBILE: Show menu button when no chat selected */}
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
    </>
  );
}
