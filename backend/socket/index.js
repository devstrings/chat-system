import jwt from "jsonwebtoken";
import { handleMessage } from "./messageHandler.js";
import { config } from "../config/index.js";
import { redisClient } from "../config/redis.js"; // import shared client

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
    console.log(` Socket connected: ${socket.id} (User: ${userId})`);

    // Save mapping in Redis hash (onlineUsers)
    try {
      await redisClient.hSet("onlineUsers", userId, socket.id);
    } catch (err) {
      console.error("Redis hSet error:", err);
    }

    // Fetch current online user ids (best-effort)
    let onlineUserIds = [];
    try {
      onlineUserIds = await redisClient.hKeys("onlineUsers");
    } catch (err) {
      console.error("Redis hKeys error:", err);
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

    // Disconnect cleanup
    socket.on("disconnect", async (reason) => {
      console.log(` User ${userId} disconnected (${reason})`);
      try {
        // Only delete if this socketId still matches what's stored (prevent race)
        const currentSocketId = await redisClient.hGet("onlineUsers", userId);
        if (!currentSocketId || currentSocketId === socket.id) {
          await redisClient.hDel("onlineUsers", userId);
        } else {
          console.log(`Not deleting onlineUsers[${userId}] because socketId differs`);
        }
      } catch (err) {
        console.error("Redis disconnect cleanup error:", err);
      }

      // Rebuild and emit updated list (best-effort)
      let updatedOnline = [];
      try {
        updatedOnline = await redisClient.hKeys("onlineUsers");
      } catch (err) {
        console.error("Redis hKeys error:", err);
      }

      io.emit("userOffline", { userId, onlineUsers: updatedOnline });
    });
  });
};
