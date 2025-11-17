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

  useEffect(() => {
    conversationIdRef.current = conversationId;
  }, [conversationId]);

  //  Fetch messages when chat changes
  useEffect(() => {
    if (!conversationId) {
      console.log(" No conversation ID, skipping message fetch");
      setMessages([]);
      setLoading(false);
      return;
    }

    const fetchMessages = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");

        console.log(" Fetching messages for conversation:", conversationId);

        const res = await axios.get(
          `http://localhost:5000/api/messages/${conversationId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        console.log(" Fetched", res.data.length, "messages");
        setMessages(res.data);

        //  Mark as read when opening chat
        if (socket && res.data.length > 0) {
          console.log(" Marking as read (on open)");
          socket.emit("markAsRead", { conversationId });
        }
      } catch (err) {
        console.error(" Error fetching messages:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [conversationId, socket]);

  // Socket listeners
  useEffect(() => {
    if (!socket) return;

    //  Receive new message
    const handleReceiveMessage = (msg) => {
      console.log(" New message received:", msg);

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

    //   FIX: Handle single message status update (both messageId and _id)
    const handleStatusUpdate = (data) => {
      console.log(" Status update received:", data);

      // Handle both messageId and _id fields
      const msgId = data.messageId || data._id;
      const status = data.status;

      if (!msgId || !status) {
        console.warn(" Invalid status update:", data);
        return;
      }

      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === msgId
            ? { ...msg, status: status }
            : msg
        )
      );

      //  If latest message is now read, inform sidebar
      if (onUpdateLastMessageStatus && status === "read") {
        // Check if this is the last message
        setMessages((prev) => {
          const lastMsg = prev[prev.length - 1];
          if (lastMsg?._id === msgId) {
            onUpdateLastMessageStatus("read");
          }
          return prev;
        });
      }

      // Also handle delivered status for sidebar
      if (onUpdateLastMessageStatus && status === "delivered") {
        setMessages((prev) => {
          const lastMsg = prev[prev.length - 1];
          if (lastMsg?._id === msgId) {
            onUpdateLastMessageStatus("delivered");
          }
          return prev;
        });
      }
    };

    //  Handle bulk read (all messages read)
    const handleMessagesRead = (data) => {
      console.log(" Messages marked as read:", data);

      if (data.conversationId === conversationIdRef.current) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.sender._id === currentUserId && msg.status !== "read"
              ? { ...msg, status: "read", readAt: new Date() }
              : msg
          )
        );

        if (onUpdateLastMessageStatus) {
          onUpdateLastMessageStatus("read");
        }
      }
    };

    socket.on("receiveMessage", handleReceiveMessage);
    socket.on("messageStatusUpdate", handleStatusUpdate);
    socket.on("messagesMarkedRead", handleMessagesRead);

    return () => {
      socket.off("receiveMessage", handleReceiveMessage);
      socket.off("messageStatusUpdate", handleStatusUpdate);
      socket.off("messagesMarkedRead", handleMessagesRead);
    };
  }, [socket, currentUserId, onUpdateLastMessageStatus]);

  //  Auto scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
    <div className="flex-1 overflow-y-auto bg-gray-900 bg-opacity-30 px-6 py-4">
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
            />
          ))}
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}