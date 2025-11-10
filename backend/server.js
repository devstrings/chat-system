import express from "express";
import http from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

// Configs
import { config } from "./config/index.js";
import connectDB from "./config/db.js";
import { connectRedis } from "./config/redis.js"; 

// Routes
import routes from "./routes/index.js";

// Socket setup import
import { setupSocket } from "./socket/index.js";

dotenv.config();

const startServer = async () => {
  try {
    //  Connect to MongoDB
    await connectDB();

    //  Connect to Redis
    await connectRedis();

    //  Setup Express + Socket.io
    const app = express();
    const server = http.createServer(app);
    const io = new Server(server, {
      cors: { origin: "*", methods: ["GET", "POST"] },
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    app.use(cors());
    app.use(express.json());
    // app.use("/uploads", express.static(path.join(__dirname, "uploads")));
    app.use("/api", routes);

    app.get("/", (_, res) => res.send("Chat server active!"));

    //  Setup Socket.io
    setupSocket(io);

    //  Start server
    server.listen(config.port, () =>
      console.log(` Server running on port ${config.port}`)
    );
  } catch (err) {
    console.error(" Server startup failed:", err);
  }
};

startServer();
