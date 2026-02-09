import React, { useState, useEffect, useRef } from "react";
import Message from "../Message";
import API_BASE_URL from "../../config/api";
import axiosInstance from "../../utils/axiosInstance";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchGroupMessages,
  addGroupMessage,
  deleteGroupMessage,
  clearGroupChatMessages,
  updateGroupMessage,
} from "../../store/slices/groupSlice";

export default function GroupChatWindow({
  group,
  currentUserId,
  searchQuery = "",
}) {
  //  Redux setup
  const dispatch = useDispatch();
  const socket = useSelector((state) => state.socket.socket);
  const messages = useSelector(
    (state) => state.group.groupMessages[group._id]?.messages || [],
  );
  const loading = useSelector((state) => state.group.loading);

  const messagesEndRef = useRef(null);
  const [typingUsers, setTypingUsers] = useState(new Set());

  //  Fetch messages
  useEffect(() => {
    if (group?._id && currentUserId) {
      dispatch(fetchGroupMessages({ groupId: group._id, currentUserId }));
    }
  }, [dispatch, group?._id, currentUserId]);

  //  Socket listeners
  useEffect(() => {
    if (!socket || !group?._id) return;

    // Handler 1: Receive message
    const handleReceiveGroupMessage = (msg) => {
      if (msg.groupId === group._id) {
        dispatch(addGroupMessage({ groupId: msg.groupId, message: msg }));
      }
    };

    // Handler 2: Typing indicator
    const handleGroupTyping = ({ userId, groupId, isTyping }) => {
      if (groupId === group._id && userId !== currentUserId) {
        setTypingUsers((prev) => {
          const newSet = new Set(prev);
          if (isTyping) {
            newSet.add(userId);
          } else {
            newSet.delete(userId);
          }
          return newSet;
        });
      }
    };

    // Handler 3: Delete message (for me)
    const handleGroupMessageDeleted = ({ messageId, groupId }) => {
      if (groupId === group._id) {
        dispatch(deleteGroupMessage({ groupId, messageId }));
      }
    };

    // Handler 4: Delete message (for everyone)
    const handleGroupMessageDeletedForEveryone = ({ messageId, groupId }) => {
      if (groupId === group._id) {
        dispatch(deleteGroupMessage({ groupId, messageId }));
      }
    };

    //  Handler 5: Clear chat
    const handleGroupChatCleared = (data) => {
      console.log("🧹 [GROUP] Chat cleared event:", data);

      if (data.groupId === group._id && data.clearedFor === currentUserId) {
        console.log("Clearing group chat from UI");
        dispatch(clearGroupChatMessages(data.groupId));
      }
    };

    //  Handler 6: Message edited
    const handleGroupMessageEdited = (data) => {
      console.log(" [GROUP] Message edited:", data);

      if (data.groupId === group._id) {
        dispatch(
          updateGroupMessage({
            groupId: data.groupId,
            messageId: data.messageId,
            text: data.text,
            editedAt: data.editedAt,
          }),
        );
      }
    };

    //  Register ALL listeners
    socket.on("receiveGroupMessage", handleReceiveGroupMessage);
    socket.on("groupUserTyping", handleGroupTyping);
    socket.on("groupMessageDeleted", handleGroupMessageDeleted);
    socket.on(
      "groupMessageDeletedForEveryone",
      handleGroupMessageDeletedForEveryone,
    );
    socket.on("groupChatCleared", handleGroupChatCleared);
    socket.on("groupMessageEdited", handleGroupMessageEdited);

    //  Cleanup ALL listeners
    return () => {
      socket.off("receiveGroupMessage", handleReceiveGroupMessage);
      socket.off("groupUserTyping", handleGroupTyping);
      socket.off("groupMessageDeleted", handleGroupMessageDeleted);
      socket.off(
        "groupMessageDeletedForEveryone",
        handleGroupMessageDeletedForEveryone,
      );
      socket.off("groupChatCleared", handleGroupChatCleared);
      socket.off("groupMessageEdited", handleGroupMessageEdited);
    };
  }, [socket, group?._id, currentUserId, dispatch]);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingUsers]);

  // Filter messages
  const filteredMessages = searchQuery
    ? messages.filter((msg) =>
        msg.text?.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : messages;

  // Group messages by date
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

  // Get typing user names
  const typingUserNames = Array.from(typingUsers)
    .map((userId) => {
      const member = group?.members?.find((m) => m._id === userId);
      return member?.username;
    })
    .filter(Boolean);

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
            className="w-16 h-16 text-gray-400 mx-auto mb-3"
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
          <p className="text-gray-400">No messages found for "{searchQuery}"</p>
        </div>
      </div>
    );
  }

  if (filteredMessages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <svg
              className="w-10 h-10 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
          <p className="text-gray-400 text-lg mb-1">No messages yet</p>
          <p className="text-gray-500 text-sm">
            Be the first to send a message!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-50 min-h-0">
      <div className="flex-1 overflow-y-auto px-3 md:px-6 py-3 md:py-4">
        {Object.entries(groupedMessages).map(([date, msgs]) => (
          <div key={date}>
            {/* Date separator */}
            <div className="flex items-center justify-center my-4">
              <div className="bg-gray-200 px-3 py-1 rounded-full shadow-sm">
                <p className="text-[10px] sm:text-xs text-gray-600 font-medium">
                  {date}
                </p>
              </div>
            </div>

            {/* Messages */}
            {msgs.map((msg) => (
              <div key={msg._id} className="mb-4">
                {msg.sender._id !== currentUserId && (
                  <p className="text-[10px] sm:text-xs text-gray-500 mb-1 ml-1 sm:ml-2">
                    {msg.sender.username}
                  </p>
                )}
                <Message
                  message={msg}
                  isOwn={
                    msg.sender._id === currentUserId ||
                    msg.sender === currentUserId
                  }
                  isGroupMessage={true}
                />
              </div>
            ))}
          </div>
        ))}

        {/* Typing indicator */}
        {typingUserNames.length > 0 && (
          <div className="flex items-start gap-2 mb-3 px-2 md:px-0">
            <div className="bg-white border border-gray-200 rounded-2xl px-3 py-2 shadow-md">
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
                <span className="text-xs text-gray-500 ml-1">
                  {typingUserNames.length === 1
                    ? `${typingUserNames[0]} is typing...`
                    : `${typingUserNames.join(", ")} are typing...`}
                </span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
