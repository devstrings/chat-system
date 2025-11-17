import jwt from "jsonwebtoken";
import { handleMessage } from "./messageHandler.js";
import { config } from "../config/index.js";
import { redisClient } from "../config/redis.js";

// ✅ Track active socket IDs per user
const userSockets = new Map(); // userId -> Set of socketIds

export const setupSocket = (io) => {
  // Authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("auth error: token missing"));
    try {
      const payload = jwt.verify(token, config.jwtSecret);
      socket.user = { id: payload.id, username: payload.username };
      next();
    } catch (err) {
      next(new Error("auth error: invalid token"));
    }
  });

  io.on("connection", async (socket) => {
    const userId = socket.user.id;
    console.log(`✅ Socket connected: ${socket.id} (User: ${userId})`);

    // ✅ Track this socket
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId).add(socket.id);
    console.log(`📊 User ${userId} has ${userSockets.get(userId).size} active socket(s)`);

    // ✅ Update Redis with latest socketId
    try {
      await redisClient.hSet("onlineUsers", userId, socket.id);
    } catch (err) {
      console.error("❌ Redis hSet error:", err);
    }

    // Fetch current online user ids
    let onlineUserIds = [];
    try {
      onlineUserIds = await redisClient.hKeys("onlineUsers");
      console.log(`📊 Total online users in Redis: ${onlineUserIds.length}`);
    } catch (err) {
      console.error("❌ Redis hKeys error:", err);
    }

    // Notify clients
    io.emit("userOnline", { userId, onlineUsers: onlineUserIds });
    socket.emit("onlineUsersList", { onlineUsers: onlineUserIds });

    // Hook message handlers
    handleMessage(io, socket);

    // Typing indicator
    socket.on("typing", ({ conversationId, isTyping }) => {
      socket.to(conversationId).emit("userTyping", { conversationId, userId, isTyping });
    });

    // ✅✅✅ IMPROVED: Disconnect cleanup
    socket.on("disconnect", async (reason) => {
      console.log(`❌ Socket ${socket.id} disconnected (${reason}) - User: ${userId}`);
      
      try {
        // ✅ Remove this socket from tracking
        if (userSockets.has(userId)) {
          userSockets.get(userId).delete(socket.id);
          const remainingSockets = userSockets.get(userId).size;
          
          console.log(`📊 User ${userId} has ${remainingSockets} remaining socket(s)`);
          
          // ✅ Only mark offline if NO sockets remain
          if (remainingSockets === 0) {
            console.log(`🔴 User ${userId} has NO remaining sockets - marking offline`);
            userSockets.delete(userId);
            
            // Delete from Redis
            const result = await redisClient.hDel("onlineUsers", userId);
            console.log(`✅ Removed ${userId} from Redis (result: ${result})`);
            
            // Get updated online list
            let updatedOnline = [];
            try {
              updatedOnline = await redisClient.hKeys("onlineUsers");
              console.log(`📊 Online users count: ${updatedOnline.length}`, updatedOnline);
            } catch (err) {
              console.error("❌ Redis hKeys error:", err);
            }

            // Broadcast offline status
            io.emit("userOffline", { userId, onlineUsers: updatedOnline });
            console.log(`📡 Broadcasted userOffline for ${userId}`);
          } else {
            console.log(`🟢 User ${userId} still has ${remainingSockets} socket(s) - staying online`);
          }
        }
      } catch (err) {
        console.error("❌ Redis disconnect cleanup error:", err);
      }
    });
  });
};