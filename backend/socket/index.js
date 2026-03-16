import jwt from "jsonwebtoken";
import { handleMessage } from "./messageHandler.js";
import { setupCallHandlers } from "./callHandler.js";
import config from "#config/index";
import { redisClient } from "#config/redis";
import User from "#models/User";
import Conversation from "#models/Conversation";

const userSockets = new Map();

// HELPER
const getUserDetailsWithImage = async (userId) => {
  try {
    const user = await User.findById(userId).select(
      "username email profileImage",
    );
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
    console.error(" Get online users details error:", err);
    return [];
  }
};

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
    socket.join(userId);

    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId).add(socket.id);
   
    try {
      await redisClient.hSet("onlineUsers", userId, socket.id);
    } catch (err) {
      console.error(" Redis hSet error:", err);
    }

    let onlineUserIds = [];
    let onlineUsersDetails = [];
    try {
      onlineUserIds = await redisClient.hKeys("onlineUsers");

      onlineUsersDetails = await getOnlineUsersWithDetails(onlineUserIds);
     
    } catch (err) {
      console.error(" Redis hKeys error:", err);
    }

    const currentUserDetails = await getUserDetailsWithImage(userId);

    io.emit("userOnline", {
      userId,
      user: currentUserDetails,
      onlineUsers: onlineUsersDetails,
    });

    socket.emit("onlineUsersList", {
      onlineUsers: onlineUsersDetails,
    });

    handleMessage(io, socket);
    // WebRTC Call Handlers
    setupCallHandlers(io, socket);

    //  TYPING INDICATOR
    socket.on("typing", async ({ conversationId, isTyping }) => {
      try {
     

        const conversation = await Conversation.findById(
          conversationId,
        ).populate("participants", "_id");

        if (!conversation) {
          console.warn(" Conversation not found:", conversationId);
          return;
        }

      

        const receiverId = conversation.participants.find(
          (p) => p._id.toString() !== userId,
        )?._id;

        if (!receiverId) {
          console.warn(" Receiver not found in conversation");
          return;
        }


        //  Find ALL sockets for the receiver (no Redis dependency)
        const receiverSockets = Array.from(io.sockets.sockets.values()).filter(
          (s) => s.user && s.user.id === receiverId.toString(),
        );

      

        if (receiverSockets.length > 0) {
          receiverSockets.forEach((receiverSocket) => {
            receiverSocket.emit("userTyping", {
              userId,
              conversationId,
              isTyping,
            });
          });
        } else {
       
        }
      } catch (err) {
        console.error(" Typing handler error:", err);
        console.error("Stack:", err.stack);
      }
    });

    socket.on("disconnect", async (reason) => {
  

      try {
        if (userSockets.has(userId)) {
          userSockets.get(userId).delete(socket.id);
          const remainingSockets = userSockets.get(userId).size;

        

          if (remainingSockets === 0) {
           
            userSockets.delete(userId);

            const result = await redisClient.hDel("onlineUsers", userId);

            let updatedOnline = [];
            let updatedOnlineDetails = [];
            try {
              updatedOnline = await redisClient.hKeys("onlineUsers");
              updatedOnlineDetails =
                await getOnlineUsersWithDetails(updatedOnline);
            
            } catch (err) {
              console.error(" Redis hKeys error:", err);
            }

            io.emit("userOffline", {
              userId,
              onlineUsers: updatedOnlineDetails,
            });
          } else {
          
          }
        }
      } catch (err) {
        console.error("Redis disconnect cleanup error:", err);
      }
    });
  });
};
