import { useEffect, useState, useRef } from "react";
import Message from "./Message";
import ConfirmationDialog from "./ConfirmationDialog";
import {
  fetchMessages,
  clearChat,
  addMessage,
  updateMessageStatus,
  bulkDeleteMessages,
} from "../store/slices/chatSlice";

import { useDispatch, useSelector } from "react-redux";
export default function ChatWindow({
  conversationId,
  currentUserId,
  searchQuery = "",
  onUpdateLastMessageStatus,
  selectedUser = null,
}) {
  const dispatch = useDispatch();
  const messages = useSelector(
    (state) => state.chat.conversations[conversationId]?.messages || [],
  );

  const loading = useSelector((state) => state.chat.loading);
  const messagesEndRef = useRef(null);
  const conversationIdRef = useRef(null);
  const messagesRef = useRef(messages);
  const socket = useSelector((state) => state.socket.socket);
  const connected = useSelector((state) => state.socket.connected);
  const onlineUsers = useSelector((state) => state.socket.onlineUsers);

  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState(new Set());
  const [typingUsers, setTypingUsers] = useState(new Set());

  const [deleteDialog, setDeleteDialog] = useState({
    isOpen: false,
    count: 0,
  });

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    conversationIdRef.current = conversationId;
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId || !currentUserId) return;

    dispatch(fetchMessages({ conversationId, currentUserId }));
  }, [dispatch, conversationId, currentUserId]);

  // CHAT CLEARED SOCKET LISTENER
  useEffect(() => {
    if (!socket || !conversationId) return;

    const handleChatCleared = (data) => {
      console.log(" [CHATWINDOW] chatCleared received:", data);

      if (
        data.conversationId === conversationId &&
        data.clearedFor === currentUserId
      ) {
        console.log(" Clearing chat window");
        dispatch(clearChat.fulfilled(conversationId));

        dispatch(
          addMessage({
            conversationId: data.conversationId,
            message: {
              _id: `cleared-${Date.now()}`,
              text: "",
              createdAt: new Date().toISOString(),
              sender: currentUserId,
              status: "sent",
              attachments: [],
              _updated: Date.now(),
            },
            userId: selectedUser?._id ?? "",
            isGroup: false,
          }),
        );
      }
    };

    socket.on("chatCleared", handleChatCleared);

    return () => {
      socket.off("chatCleared", handleChatCleared);
    };
  }, [socket, conversationId, currentUserId, dispatch]);

  // YEH LAGAO
  useEffect(() => {
    if (!socket) return;

    const handleStatusUpdate = (data) => {
      const msgId = data.messageId || data._id;
      const status = data.status;
      const convId = data.conversationId;
      if (!msgId || !status) return;
      dispatch(
        updateMessageStatus({
          conversationId: convId,
          messageId: msgId,
          status,
        }),
      );
    };

    const handleTyping = ({ userId, isTyping, conversationId }) => {
      if (conversationId !== conversationIdRef.current) return;
      setTypingUsers((prev) => {
        const newSet = new Set(prev);
        if (isTyping) newSet.add(userId);
        else newSet.delete(userId);
        return newSet;
      });
    };

    socket.on("messageStatusUpdate", handleStatusUpdate);
    socket.on("userTyping", handleTyping);

    return () => {
      socket.off("messageStatusUpdate", handleStatusUpdate);
      socket.off("userTyping", handleTyping);
    };
  }, [socket, dispatch]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingUsers]);

  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedMessages(new Set());
  };

  const toggleMessageSelection = (messageId) => {
    setSelectedMessages((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  const selectAllMessages = () => {
    const allMessageIds = messages.map((msg) => msg._id);
    setSelectedMessages(new Set(allMessageIds));
  };

  const deselectAllMessages = () => {
    setSelectedMessages(new Set());
  };

  const handleBulkDelete = () => {
    if (selectedMessages.size === 0) {
      return;
    }

    setDeleteDialog({
      isOpen: true,
      count: selectedMessages.size,
    });
  };

  const confirmBulkDelete = async () => {
    try {
      const messageIds = Array.from(selectedMessages);

      //  Redux async thunk use karo
      await dispatch(
        bulkDeleteMessages({
          messageIds,
          conversationId,
          deleteForEveryone: false, // For me only
        }),
      ).unwrap();

      // Clear selection
      setIsSelectionMode(false);
      setSelectedMessages(new Set());
      setDeleteDialog({ isOpen: false, count: 0 });

      console.log(` Deleted ${messageIds.length} messages`);
    } catch (err) {
      console.error(" Bulk delete error:", err);
      alert("Failed to delete messages");
    }
  };

  const filteredMessages = searchQuery
    ? messages.filter((msg) =>
        msg.text?.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : messages;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3 mx-auto"></div>
          <p className="text-gray-400 text-sm">Loading messages...</p>
        </div>
      </div>
    );
  }

  if (filteredMessages.length === 0 && searchQuery) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center">
          <svg
            className="w-12 h-12 md:w-16 md:h-16 text-gray-600 mx-auto mb-3"
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
          <p className="text-gray-400 text-sm md:text-base">
            No messages found for "{searchQuery}"
          </p>
        </div>
      </div>
    );
  }

  if (filteredMessages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center">
          <div className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-4 rounded-full bg-gray-800 bg-opacity-50 flex items-center justify-center">
            <svg
              className="w-8 h-8 md:w-10 md:h-10 text-gray-600"
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
          <p className="text-gray-400 text-base md:text-lg mb-1">
            No messages yet
          </p>
          <p className="text-gray-500 text-xs md:text-sm">
            Start the conversation!
          </p>
        </div>
      </div>
    );
  }

  const groupedMessages = filteredMessages.reduce((groups, msg) => {
    const date = new Date(msg.createdAt).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    if (!groups[date]) groups[date] = [];
    groups[date].push(msg);
    return groups;
  }, {});

  console.log(" Rendering ChatWindow:", {
    typingUsersSize: typingUsers.size,
    typingUsersArray: Array.from(typingUsers),
    hasSelectedUser: !!selectedUser,
    selectedUserId: selectedUser?._id,
  });

  return (
    <>
      <div className="flex-1 flex flex-col bg-gray-50 min-h-0">
        {isSelectionMode && (
          <div className="bg-white border-b border-gray-300 shadow-sm px-2 md:px-6 py-2 md:py-3 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3 md:gap-4">
              <button
                onClick={toggleSelectionMode}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg
                  className="w-5 h-5 md:w-6 md:h-6"
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
              <span className="text-gray-900 font-medium text-sm md:text-base">
                {selectedMessages.size} selected
              </span>
            </div>

            <div className="flex items-center gap-2">
              {selectedMessages.size < filteredMessages.length ? (
                <button
                  onClick={selectAllMessages}
                  className="px-2 md:px-3 py-1 md:py-1.5 text-xs md:text-sm bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg transition-colors"
                >
                  All
                </button>
              ) : (
                <button
                  onClick={deselectAllMessages}
                  className="px-2 md:px-3 py-1 md:py-1.5 text-xs md:text-sm bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg transition-colors"
                >
                  None
                </button>
              )}

              <button
                onClick={handleBulkDelete}
                disabled={selectedMessages.size === 0}
                className="px-3 md:px-4 py-1 md:py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-xs md:text-sm"
              >
                <svg
                  className="w-3.5 h-3.5 md:w-4 md:h-4"
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
                <span className="hidden sm:inline">Delete</span>
              </button>
            </div>
          </div>
        )}

        <div
          className="flex-1 overflow-y-auto px-3 md:px-6 py-4"
          style={{ minHeight: 0 }}
        >
          {!isSelectionMode && messages.length > 0 && (
            <div className="flex justify-center mb-4 sticky top-0 z-10">
              <button
                onClick={toggleSelectionMode}
                className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 px-2.5 md:px-4 py-1.5 md:py-2 rounded-full shadow-lg transition-colors flex items-center gap-1.5 text-[11px] md:text-sm"
              >
                <svg
                  className="w-3.5 h-3.5 md:w-4 md:h-4"
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
                Select Messages
              </button>
            </div>
          )}

          {Object.entries(groupedMessages).map(([date, msgs]) => (
            <div key={date}>
              <div className="flex items-center justify-center my-4">
                <div className="bg-gray-200 px-3 md:px-4 py-1 rounded-full shadow-sm">
                  <p className="text-xs text-gray-600 font-medium">{date}</p>
                </div>
              </div>

              {msgs.map((msg) => (
                <Message
                  key={msg._id}
                  message={msg}
                  isOwn={
                    msg.sender._id === currentUserId ||
                    msg.sender === currentUserId
                  }
                  isSelectionMode={isSelectionMode}
                  isSelected={selectedMessages.has(msg._id)}
                  onToggleSelect={toggleMessageSelection}
                />
              ))}
            </div>
          ))}

          {/* TYPING INDICATOR  */}
          {typingUsers.size > 0 && selectedUser && (
            <div className="flex items-start gap-2 mb-3 px-2 md:px-0">
              <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-[10px] md:text-xs font-semibold flex-shrink-0 shadow-md">
                {selectedUser.username.charAt(0).toUpperCase()}
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-md">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <div
                      className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    />
                    <div
                      className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    />
                    <div
                      className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 ml-1">typing...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <ConfirmationDialog
        isOpen={deleteDialog.isOpen}
        onClose={() => setDeleteDialog({ ...deleteDialog, isOpen: false })}
        onConfirm={confirmBulkDelete}
        title="Delete Messages?"
        message={`Delete ${deleteDialog.count} message(s) for you? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        icon="delete"
        type="danger"
      />
    </>
  );
}
