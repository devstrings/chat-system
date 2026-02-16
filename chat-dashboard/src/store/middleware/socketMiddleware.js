import { io } from "socket.io-client";
import { SOCKET_URL } from "../../config/api";import {
  setSocket,
  setConnected,
  setOnlineUsers,
  addOnlineUser,
  removeOnlineUser,
  clearSocket,
} from "../slices/socketSlice";
import {
  addMessage,
  updateMessageStatus,
  deleteMessage,
  removeMessageForEveryone,
  updateMessage,
  incrementUnreadCount,
} from "../slices/chatSlice";
import {
  addGroupMessage,
  deleteGroupMessage,
  updateGroupTyping,
  updateGroupMessage,
} from "../slices/groupSlice";

const socketMiddleware = (store) => {
  let socket = null;
  let tokenRef = null;

  return (next) => (action) => {
    const state = store.getState();
    const isAuthenticated = state.auth.isAuthenticated;
    const currentUserId = state.auth.currentUserId;

    // Initialize socket on login

    if (
      action.type === "auth/login/fulfilled" ||
      (isAuthenticated && !socket && action.type !== "auth/logout/fulfilled")
    ) {
      if (socket) {
        return next(action);
      }
      const accessToken = localStorage.getItem("accessToken");
      const refreshToken = localStorage.getItem("refreshToken");

      if (!accessToken && !refreshToken) {
        return next(action);
      }

      console.log(" Initializing socket connection...");
socket = io(SOCKET_URL, {
  auth: { token: accessToken },
  transports: ["websocket"],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: Infinity,
  timeout: 20000,
  upgrade: false,
});

      tokenRef = accessToken;

      // Store socket in Redux
      store.dispatch(setSocket(socket));

      //  CONNECTION EVENTS
      socket.on("connect", () => {
        console.log("Socket connected:", socket.id);
        store.dispatch(setConnected(true));
      });

      socket.on("disconnect", (reason) => {
        console.warn(" Socket disconnected:", reason);
        store.dispatch(setConnected(false));
      });

      socket.on("connect_error", (err) => {
        console.error(" Socket connection error:", err.message);
        store.dispatch(setConnected(false));

        if (
          err.message.includes("Authentication") ||
          err.message.includes("token")
        ) {
          console.error(" Socket auth failed, logging out");
          localStorage.clear();
          window.location.href = "/login";
        }
      });

      // ONLINE USERS
      socket.on("onlineUsersList", (data) => {
        console.log(" Online users list:", data.onlineUsers?.length || 0);
        if (data.onlineUsers && Array.isArray(data.onlineUsers)) {
          const userIds = data.onlineUsers.map((u) => u._id);
          store.dispatch(setOnlineUsers(userIds));
        }
      });

      socket.on("userOnline", (data) => {
        console.log(" User came online:", data.user?.username);
        store.dispatch(addOnlineUser(data.userId));
      });

      socket.on("userOffline", (data) => {
        console.log(" User went offline:", data.userId);
        store.dispatch(removeOnlineUser(data.userId));
      });

      // INDIVIDUAL CHAT MESSAGES
      socket.on("receiveMessage", (msg) => {
        console.log("Received message:", msg._id);

        const senderId = msg.sender?._id || msg.sender;
        const receiverId = msg.receiver?._id || msg.receiver;

        const otherUserId =
          senderId?.toString() === currentUserId
            ? receiverId?.toString()
            : senderId?.toString();

        // Conversation messages update
        store.dispatch(
          addMessage({
            conversationId: msg.conversationId,
            message: msg,
            userId: otherUserId,
            isGroup: false,
          }),
        );

        // Unread sirf receiver ke liye
        if (senderId?.toString() !== currentUserId) {
          store.dispatch(incrementUnreadCount(senderId?.toString()));
        }
      });

      socket.on("messageStatusUpdate", (data) => {
        console.log(" Message status update:", data);
        store.dispatch(updateMessageStatus(data));
      });

      socket.on("messagesMarkedRead", (data) => {
        console.log(" Messages marked read:", data.conversationId);
      });

      // NAYA CODE
      socket.on("messageDeleted", (data) => {
        console.log(" Message deleted:", data.messageId);
        store.dispatch(
          deleteMessage({
            conversationId: data.conversationId,
            messageId: data.messageId,
          }),
        );

        const state = store.getState();
        const messages =
          state.chat.conversations[data.conversationId]?.messages || [];

        const remaining = messages.filter(
          (m) => m._id !== data.messageId && !m.deletedForEveryone,
        );

        const newLast =
          remaining.length > 0 ? remaining[remaining.length - 1] : null;

        const otherUserId = Object.keys(state.chat.lastMessages).find(
          (uid) =>
            state.chat.lastMessages[uid]?.conversationId ===
            data.conversationId,
        );

        if (otherUserId) {
          store.dispatch(
            addMessage({
              conversationId: data.conversationId,
              message: {
                _id: `sidebar-update-${Date.now()}`,
                text: newLast?.text ?? "",
                createdAt: newLast?.createdAt ?? new Date().toISOString(),
                sender: newLast?.sender ?? currentUserId,
                status: newLast?.status ?? "sent",
                attachments: newLast?.attachments ?? [],
                _updated: Date.now(),
              },
              userId: otherUserId,
              isGroup: false,
            }),
          );
        }
      });

      socket.on("messageDeletedForEveryone", (data) => {
        console.log(" Message deleted for everyone:", data.messageId);
        store.dispatch(
          removeMessageForEveryone({
            conversationId: data.conversationId,
            messageId: data.messageId,
          }),
        );

        const state = store.getState();
        const messages =
          state.chat.conversations[data.conversationId]?.messages || [];

        const remaining = messages.filter(
          (m) => m._id !== data.messageId && !m.deletedForEveryone,
        );

        const newLast =
          remaining.length > 0 ? remaining[remaining.length - 1] : null;

        const otherUserId = Object.keys(state.chat.lastMessages).find(
          (uid) =>
            state.chat.lastMessages[uid]?.conversationId ===
            data.conversationId,
        );

        if (otherUserId) {
          store.dispatch(
            addMessage({
              conversationId: data.conversationId,
              message: {
                _id: `sidebar-update-${Date.now()}`,
                text: newLast?.text ?? "",
                createdAt: newLast?.createdAt ?? new Date().toISOString(),
                sender: newLast?.sender ?? currentUserId,
                status: newLast?.status ?? "sent",
                attachments: newLast?.attachments ?? [],
                _updated: Date.now(),
              },
              userId: otherUserId,
              isGroup: false,
            }),
          );
        }
      });
      socket.on("groupMessageEdited", (data) => {
        console.log(" Group message edited:", data.messageId);
        store.dispatch(
          updateGroupMessage({
            groupId: data.groupId,
            messageId: data.messageId,
            text: data.text,
            editedAt: data.editedAt,
          }),
        );
      });
      socket.on("messageEdited", (data) => {
        console.log(" Message edited:", data.messageId);
        store.dispatch(
          updateMessage({
            conversationId: data.conversationId,
            messageId: data.messageId,
            text: data.text,
            editedAt: data.editedAt,
          }),
        );
      });

      socket.on("chatCleared", (data) => {
        console.log(" Chat cleared:", data.conversationId);
      });

      socket.on("conversationDeleted", (data) => {
        console.log(" Conversation deleted:", data.conversationId);
      });

      //  GROUP CHAT MESSAGES
      socket.on("receiveGroupMessage", (msg) => {
        console.log(" Group message received:", msg._id);

        // Group messages update
        store.dispatch(
          addGroupMessage({
            groupId: msg.groupId,
            message: msg,
          }),
        );

        // Sidebar last message update
        store.dispatch(
          addMessage({
            conversationId: msg.groupId,
            message: msg,
            userId: msg.groupId,
            isGroup: true,
          }),
        );
      });

      socket.on("groupMessageDeleted", (data) => {
        console.log(" Group message deleted:", data.messageId);
        store.dispatch(
          deleteGroupMessage({
            groupId: data.groupId,
            messageId: data.messageId,
          }),
        );
      });

      socket.on("groupMessageDeletedForEveryone", (data) => {
        console.log(" Group message deleted for everyone:", data.messageId);
        store.dispatch(
          deleteGroupMessage({
            groupId: data.groupId,
            messageId: data.messageId,
          }),
        );
      });

      socket.on("groupUserTyping", (data) => {
        console.log("⌨ Group typing:", data);
        store.dispatch(
          updateGroupTyping({
            groupId: data.groupId,
            userId: data.userId,
            isTyping: data.isTyping,
          }),
        );
      });

      socket.on("groupChatCleared", (data) => {
        console.log(" Group chat cleared:", data.groupId);
      });

      // TYPING INDICATORS
      socket.on("userTyping", (data) => {
        console.log("⌨ User typing:", data);
        // Handle typing indicator in UI
      });

      //  STATUS EVENTS
      socket.on("newStatus", (data) => {
        console.log(" New status:", data);
        // Handle status update
      });

      socket.on("statusDeleted", (data) => {
        console.log(" Status deleted:", data);
        // Handle status deletion
      });

      socket.on("statusViewed", (data) => {
        console.log("Status viewed:", data);
        // Handle status view
      });

      //  ERROR HANDLING
      socket.on("errorMessage", (data) => {
        console.error(" Socket error:", data);
        alert(data.message);
      });
    }

    // Cleanup socket on logout
    if (action.type === "auth/logout/fulfilled") {
      console.log(" Disconnecting socket...");

      if (socket) {
        socket.removeAllListeners();
        socket.disconnect();
        socket = null;
      }

      store.dispatch(clearSocket());
    }

    return next(action);
  };
};

export default socketMiddleware;
