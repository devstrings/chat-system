import { redisClient } from "#config/redis";
import User from "#models/User";
import Conversation from "#models/Conversation";
import { handleMessage } from "#socket/messageHandler";
import { setupCallHandlers } from "#socket/callHandler";

const userSockets = new Map();

// HELPERS
const getUserDetailsWithImage = async (userId) => {
  try {
    const user = await User.findById(userId).select("username email profileImage");
    if (!user) return null;
    return {
      _id: user._id,
      username: user.username,
      email: user.email,
      profileImage: user.profileImage,
    };
  } catch (err) {
    console.error("Get user details error:", err);
    return null;
  }
};

const getOnlineUsersWithDetails = async (userIds) => {
  try {
    const users = await User.find({
      _id: { $in: userIds },
    }).select("username email profileImage");

    return users.map((user) => ({
      _id: user._id.toString(),
      username: user.username,
      email: user.email,
      profileImage: user.profileImage,
    }));
  } catch (err) {
    console.error("Get online users details error:", err);
    return [];
  }
};

export const webSocketConnection = async (io, socket) => {
  const userId = socket.user.id;
  socket.join(userId);

  if (!userSockets.has(userId)) {
    userSockets.set(userId, new Set());
  }
  userSockets.get(userId).add(socket.id);

  try {
    await redisClient.hSet("onlineUsers", userId, socket.id);
  } catch (err) {
    console.error("Redis hSet error:", err);
  }

  let onlineUserIds = [];
  let onlineUsersDetails = [];
  try {
    onlineUserIds = await redisClient.hKeys("onlineUsers");
    onlineUsersDetails = await getOnlineUsersWithDetails(onlineUserIds);
  } catch (err) {
    console.error("Redis hKeys error:", err);
  }

  const currentUserDetails = await getUserDetailsWithImage(userId);

  // Notify everyone
  io.emit("userOnline", {
    userId,
    user: currentUserDetails,
    onlineUsers: onlineUsersDetails,
  });

  // Notify the newly connected user
  socket.emit("onlineUsersList", {
    onlineUsers: onlineUsersDetails,
  });

  // Attach Handlers
  handleMessage(io, socket);
  setupCallHandlers(io, socket);

  // TYPING INDICATOR
  socket.on("typing", async ({ conversationId, isTyping }) => {
    try {
      const conversation = await Conversation.findById(conversationId).populate("participants", "_id");
      if (!conversation) return;

      const receiverId = conversation.participants.find(
        (p) => p._id.toString() !== userId,
      )?._id;

      if (!receiverId) return;

      // Emit to all sockets of the receiver
      io.to(receiverId.toString()).emit("userTyping", {
        userId,
        conversationId,
        isTyping,
      });
    } catch (err) {
      console.error("Typing handler error:", err);
    }
  });

  socket.on("disconnect", async (reason) => {
    try {
      if (userSockets.has(userId)) {
        userSockets.get(userId).delete(socket.id);
        const remainingSockets = userSockets.get(userId).size;

        if (remainingSockets === 0) {
          userSockets.delete(userId);
          await redisClient.hDel("onlineUsers", userId);

          let updatedOnline = await redisClient.hKeys("onlineUsers");
          let updatedOnlineDetails = await getOnlineUsersWithDetails(updatedOnline);

          io.emit("userOffline", {
            userId,
            onlineUsers: updatedOnlineDetails,
          });
        }
      }
    } catch (err) {
      console.error("Redis disconnect cleanup error:", err);
    }
  });
};
