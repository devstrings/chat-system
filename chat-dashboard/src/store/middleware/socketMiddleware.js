import { io } from "socket.io-client";
import { SOCKET_URL } from "@/config/api";
import {
  setSocket,
  setConnected,
  setOnlineUsers,
  addOnlineUser,
  removeOnlineUser,
  clearSocket,
} from "@/store/slices/socketSlice";
import { decryptMessageHelper } from "@/utils/cryptoUtils";
import {
  addMessage,
  updateMessageStatus,
  deleteMessage,
  removeMessageForEveryone,
  updateMessage,
  incrementUnreadCount,
  updateLastMessage,
  fetchConversation,
} from "@/store/slices/chatSlice";
import {
  addGroupMessage,
  deleteGroupMessage,
  updateGroupTyping,
  updateGroupMessage,
} from "@/store/slices/groupSlice";

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

      socket = io(SOCKET_URL, {
        auth: { token: accessToken },
        path: "/webSocket",
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
        store.dispatch(setConnected(true));
      });

      socket.on("disconnect", (reason) => {
        console.warn(" Socket disconnected:", reason);
        store.dispatch(setConnected(false));

        if (reason === "io server disconnect") {
          const freshToken = localStorage.getItem("accessToken");
          if (freshToken && socket) {
            socket.auth = { token: freshToken };
            socket.connect();
          }
        }
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
        if (data.onlineUsers && Array.isArray(data.onlineUsers)) {
          const userIds = data.onlineUsers.map((u) => u._id);
          store.dispatch(setOnlineUsers(userIds));
        }
      });

      socket.on("userOnline", (data) => {
        store.dispatch(addOnlineUser(data.userId));
      });

      socket.on("userOffline", (data) => {
        store.dispatch(removeOnlineUser(data.userId));
      });

      // INDIVIDUAL CHAT MESSAGES
      socket.on("receiveMessage", async (msg) => {
        if (msg.encryptionData?.keys instanceof Map) {
          msg.encryptionData.keys = Object.fromEntries(msg.encryptionData.keys);
        }
        const senderId = msg.sender?._id || msg.sender;
        const receiverId = msg.receiver?._id || msg.receiver;
        const otherUserId =
          senderId?.toString() === currentUserId
            ? receiverId?.toString()
            : senderId?.toString();

        let state = store.getState();
        let sharedKey = state.chat.sharedKeys[msg.conversationId];

        // Receiver may get socket message before shared key is loaded in Redux.
        if (msg.encryptionData?.isSharedKey && !sharedKey && otherUserId) {
          try {
            await store.dispatch(
              fetchConversation({ otherUserId, skipCreate: true }),
            );
            state = store.getState();
            sharedKey = state.chat.sharedKeys[msg.conversationId];
          } catch (error) {
            console.warn(
              "Failed to preload shared key for incoming message",
              error,
            );
          }
        }

        msg.text = await decryptMessageHelper(msg, currentUserId, sharedKey);

        // Conversation messages update
        store.dispatch(
          addMessage({
            conversationId: msg.conversationId,
            message: msg,
            userId: otherUserId,
            isGroup: false,
          }),
        );

        // Unread
        if (senderId?.toString() !== currentUserId) {
          store.dispatch(incrementUnreadCount(senderId?.toString()));
        }
      });

      socket.on("messageStatusUpdate", (data) => {
        store.dispatch(updateMessageStatus(data));
      });

      socket.on("messagesMarkedRead", (data) => {});

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
                _updated: newLast
                  ? new Date(newLast.createdAt).getTime()
                  : new Date(
                      state.chat.lastMessages[otherUserId]?.time,
                    ).getTime(),
              },
              userId: otherUserId,
              isGroup: false,
            }),
          );
        }
      });

      socket.on("messageDeletedForEveryone", (data) => {
        store.dispatch(
          removeMessageForEveryone({
            conversationId: data.conversationId,
            messageId: data.messageId,
          }),
        );

        setTimeout(() => {
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
              updateLastMessage({
                userId: otherUserId,
                conversationId: data.conversationId,
                text: newLast?.text ?? "",
                timestamp: newLast
                  ? new Date(newLast.createdAt).getTime()
                  : Date.now(),
              }),
            );
          }
        }, 50);
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

      socket.on("conversationUpdated", (data) => {
        const state = store.getState();
        const otherUserId = Object.keys(state.chat.lastMessages).find(
          (uid) =>
            state.chat.lastMessages[uid]?.conversationId ===
            data.conversationId,
        );
        if (otherUserId) {
          store.dispatch(
            updateLastMessage({
              userId: otherUserId,
              conversationId: data.conversationId,
              text: data.lastMessage ?? "",
              timestamp: data.lastMessageTime
                ? new Date(data.lastMessageTime).getTime()
                : Date.now(),
            }),
          );
        }
      });
      socket.on("conversationDeleted", (data) => {
        console.log(" Conversation deleted:", data.conversationId);
      });

      //  GROUP CHAT MESSAGES
      socket.on("receiveGroupMessage", async (msg) => {
        if (msg.encryptionData?.keys instanceof Map) {
          msg.encryptionData.keys = Object.fromEntries(msg.encryptionData.keys);
        }
        msg.text = await decryptMessageHelper(msg, currentUserId, null);
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
        store.dispatch(
          deleteGroupMessage({
            groupId: data.groupId,
            messageId: data.messageId,
          }),
        );
      });

      socket.on("groupUserTyping", (data) => {
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
        // Handle typing indicator in UI
      });

      //  STATUS EVENTS
      socket.on("newStatus", (data) => {
        // Handle status update
      });

      socket.on("statusDeleted", (data) => {
        // Handle status deletion
      });

      socket.on("statusViewed", (data) => {
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
