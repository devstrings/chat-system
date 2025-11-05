import express from "express";
import http from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import cors from "cors";
import jwt from "jsonwebtoken";
import path from "path";
import { fileURLToPath } from "url";

// config imports
import connectDB from "./config/db.js";

// routes & socket handlers
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import { handleMessage } from "./socket/messageHandler.js";

dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app);
const io = new Server(server, { 
  cors: { 
    origin: "*",
    methods: ["GET", "POST"]
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/upload", uploadRoutes);

app.get("/", (_, res) => res.send(" Chat server active!"));

// In-memory online users
const onlineUsers = new Map();

// Socket.io auth middleware
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error("auth error: token missing"));

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = { id: payload.id, username: payload.username };
    next();
  } catch (err) {
    next(new Error("auth error: invalid token"));
  }
});

// Socket connection
io.on("connection", (socket) => {
  const userId = socket.user.id;
  console.log(` Socket connected: ${socket.id} (User: ${userId})`);

  onlineUsers.set(userId, socket.id);
  
  const onlineUserIds = Array.from(onlineUsers.keys());
  console.log(` Total online users: ${onlineUserIds.length}`);
  
  // Broadcast to ALL clients
  io.emit("userOnline", { userId, onlineUsers: onlineUserIds });
  socket.emit("onlineUsersList", { onlineUsers: onlineUserIds });

  //  USE MESSAGE HANDLER (with status support)
  handleMessage(io, socket);

  // Typing indicator
  socket.on("typing", ({ conversationId, isTyping }) => {
    socket.to(conversationId).emit("userTyping", {
      conversationId,
      userId,
      isTyping,
    });
  });

  // Disconnect
  socket.on("disconnect", (reason) => {
    console.log(` User ${userId} disconnected (Reason: ${reason})`);
    
    onlineUsers.delete(userId);
    
    const onlineUserIds = Array.from(onlineUsers.keys());
    io.emit("userOffline", { userId, onlineUsers: onlineUserIds });
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(` Server running on port ${PORT}`));