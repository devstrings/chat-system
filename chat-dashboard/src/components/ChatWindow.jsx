import { useEffect, useState, useRef } from "react";
import { useSocket } from "../context/SocketContext";
import Message from "./Message";
import axios from "axios";

export default function ChatWindow({
  conversationId,
  currentUserId,
  searchQuery = "",
  onUpdateLastMessageStatus,
}) {
  const { socket } = useSocket();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);
  const conversationIdRef = useRef(null);
  const messagesRef = useRef(messages); // ✅ Add ref for messages

  // 🆕 Selection Mode States
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState(new Set());

  // ✅ Keep messages ref updated
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    conversationIdRef.current = conversationId;
  }, [conversationId]);

  //  Fetch messages when chat changes
  useEffect(() => {
    if (!conversationId) {
      console.log("⚠️ No conversation ID, skipping message fetch");
      setMessages([]);
      setLoading(false);
      return;
    }

    const fetchMessages = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");

        console.log("📥 Fetching messages for conversation:", conversationId);

        const res = await axios.get(
          `http://localhost:5000/api/messages/${conversationId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        console.log("✅ Fetched", res.data.length, "messages");
        setMessages(res.data);

        //  Mark as read when opening chat
        if (socket && res.data.length > 0) {
          console.log("👁️ Marking as read (on open)");
          socket.emit("markAsRead", { conversationId });
        }
      } catch (err) {
        console.error("❌ Error fetching messages:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();

    // Reset selection mode when changing conversation
    setIsSelectionMode(false);
    setSelectedMessages(new Set());
  }, [conversationId, socket]);

  // Socket listeners
  useEffect(() => {
    if (!socket) return;

    //  Receive new message
    const handleReceiveMessage = (msg) => {
      console.log("📨 New message received:", msg);

      if (msg.conversationId === conversationIdRef.current) {
        setMessages((prev) => [...prev, msg]);

        //  Sidebar instantly reflects last message
        if (onUpdateLastMessageStatus) {
          onUpdateLastMessageStatus(msg.status || "sent");
        }

        //  Auto mark as read (delay for render)
        if (socket && msg.sender._id !== currentUserId) {
          setTimeout(() => {
            socket.emit("markAsRead", { conversationId: msg.conversationId });
          }, 300);
        }
      }
    };

    //  Handle single message status update (✅ FIXED)
    const handleStatusUpdate = (data) => {
      console.log("📊 Status update received:", data);

      const msgId = data.messageId || data._id;
      const status = data.status;

      if (!msgId || !status) {
        console.warn("⚠️ Invalid status update:", data);
        return;
      }

      // ✅ Update messages state
      queueMicrotask(() => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg._id === msgId
              ? { ...msg, status: status }
              : msg
          )
        );
      });

      // ✅ FIXED: Update sidebar without setMessages
      if (onUpdateLastMessageStatus) {
        queueMicrotask(() => {
          const currentMessages = messagesRef.current;
          const lastMsg = currentMessages[currentMessages.length - 1];
          if (lastMsg?._id === msgId) {
            onUpdateLastMessageStatus(status);
          }
        });
      }
    };

    //  Handle bulk read (all messages read)
    const handleMessagesRead = (data) => {
      console.log("👁️ Messages marked as read:", data);

      if (data.conversationId === conversationIdRef.current) {
        queueMicrotask(() => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.sender._id === currentUserId && msg.status !== "read"
                ? { ...msg, status: "read", readAt: new Date() }
                : msg
            )
          );
        });

        if (onUpdateLastMessageStatus) {
          queueMicrotask(() => {
            onUpdateLastMessageStatus("read");
          });
        }
      }
    };

    // 🆕 Handle message deleted (for me)
    const handleMessageDeleted = (data) => {
      console.log("🗑️ Message deleted:", data);
      
      if (data.messageId) {
        queueMicrotask(() => {
          setMessages((prev) => prev.filter((msg) => msg._id !== data.messageId));
        });
      }
    };

    // 🆕 Handle message deleted for everyone
    const handleMessageDeletedForEveryone = (data) => {
      console.log("🗑️ Message deleted for everyone:", data);
      
      if (data.messageId && data.conversationId === conversationIdRef.current) {
        queueMicrotask(() => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg._id === data.messageId
                ? { ...msg, deletedForEveryone: true, text: "", attachments: [] }
                : msg
            )
          );
        });
      }
    };

    socket.on("receiveMessage", handleReceiveMessage);
    socket.on("messageStatusUpdate", handleStatusUpdate);
    socket.on("messagesMarkedRead", handleMessagesRead);
    socket.on("messageDeleted", handleMessageDeleted);
    socket.on("messageDeletedForEveryone", handleMessageDeletedForEveryone);

    return () => {
      socket.off("receiveMessage", handleReceiveMessage);
      socket.off("messageStatusUpdate", handleStatusUpdate);
      socket.off("messagesMarkedRead", handleMessagesRead);
      socket.off("messageDeleted", handleMessageDeleted);
      socket.off("messageDeletedForEveryone", handleMessageDeletedForEveryone);
    };
  }, [socket, currentUserId, onUpdateLastMessageStatus]);

  //  Auto scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 🆕 Selection Mode Functions
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

  const handleBulkDelete = async () => {
    if (selectedMessages.size === 0) {
      alert("Please select messages to delete");
      return;
    }

    const confirmed = window.confirm(
      `Delete ${selectedMessages.size} message(s) for you?`
    );

    if (!confirmed) return;

    try {
      const token = localStorage.getItem("token");
      const messageIds = Array.from(selectedMessages);

      await axios.post(
        "http://localhost:5000/api/messages/messages/bulk-delete",
        { messageIds },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Remove deleted messages from UI
      setMessages((prev) =>
        prev.filter((msg) => !selectedMessages.has(msg._id))
      );

      // Reset selection mode
      setIsSelectionMode(false);
      setSelectedMessages(new Set());

      console.log("✅ Bulk delete successful");
    } catch (err) {
      console.error("❌ Bulk delete error:", err);
      alert("Failed to delete messages");
    }
  };

  //  Filter messages by search
  const filteredMessages = searchQuery
    ? messages.filter((msg) =>
        msg.text?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : messages;

  //  Loading state
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-900 bg-opacity-30">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3 mx-auto"></div>
          <p className="text-gray-400 text-sm">Loading messages...</p>
        </div>
      </div>
    );
  }

  //  No messages found
  if (filteredMessages.length === 0 && searchQuery) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-900 bg-opacity-30">
        <div className="text-center">
          <svg
            className="w-16 h-16 text-gray-600 mx-auto mb-3"
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
          <p className="text-gray-400">
            No messages found for "{searchQuery}"
          </p>
        </div>
      </div>
    );
  }

  //  No messages yet
  if (filteredMessages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-900 bg-opacity-30">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-800 bg-opacity-50 flex items-center justify-center">
            <svg
              className="w-10 h-10 text-gray-600"
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
          <p className="text-gray-400 text-lg mb-1">No messages yet</p>
          <p className="text-gray-500 text-sm">Start the conversation!</p>
        </div>
      </div>
    );
  }

  //  Group by date
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

  //  Render UI
  return (
    <div className="flex-1 flex flex-col bg-gray-900 bg-opacity-30 min-h-0">
      {/* 🆕 Selection Mode Header */}
      {isSelectionMode && (
        <div className="bg-gray-800 bg-opacity-90 border-b border-gray-700 px-6 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={toggleSelectionMode}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <span className="text-white font-medium">
              {selectedMessages.size} selected
            </span>
          </div>

          <div className="flex items-center gap-2">
            {selectedMessages.size < filteredMessages.length ? (
              <button
                onClick={selectAllMessages}
                className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Select All
              </button>
            ) : (
              <button
                onClick={deselectAllMessages}
                className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Deselect All
              </button>
            )}

            <button
              onClick={handleBulkDelete}
              disabled={selectedMessages.size === 0}
              className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Messages Container - ✅ FIXED LAYOUT */}
      <div className="flex-1 overflow-y-auto px-6 py-4" style={{ minHeight: 0 }}>
        {/* 🆕 Selection Mode Toggle Button (Floating) */}
        {!isSelectionMode && messages.length > 0 && (
          <div className="flex justify-center mb-4 sticky top-0 z-10">
            <button
              onClick={toggleSelectionMode}
              className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2 rounded-full shadow-lg transition-colors flex items-center gap-2 text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Select Messages
            </button>
          </div>
        )}

        {Object.entries(groupedMessages).map(([date, msgs]) => (
          <div key={date}>
            {/*  Date divider */}
            <div className="flex items-center justify-center my-4">
              <div className="bg-gray-800 bg-opacity-70 px-4 py-1 rounded-full shadow-md">
                <p className="text-xs text-gray-400 font-medium">{date}</p>
              </div>
            </div>

            {/*  Messages */}
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
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}