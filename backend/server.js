import express from "express";
import http from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import swaggerUi from "swagger-ui-express";

// Configs
import { config } from "./config/index.js";
import connectDB from "./config/db.js";
import { connectRedis } from "./config/redis.js"; 

// Routes - function import
import setupRoutes from "./routes/index.js"; 

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
    // Serve uploaded files if needed
    // app.use("/uploads", express.static(path.join(__dirname, "uploads")));

    // --- Swagger UI Setup ---
    const swaggerFilePath = path.join(__dirname, "openapi.json");
    if (fs.existsSync(swaggerFilePath)) {
      const swaggerDocument = JSON.parse(fs.readFileSync(swaggerFilePath, "utf-8"));
      app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
      console.log(`Swagger docs available at http://localhost:${config.port}/api-docs`);
    } else {
      console.warn("OpenAPI file not found. Swagger UI not available.");
    }
    // ----------------------

    // Setup routes
    setupRoutes(app);

    // Default route
    app.get("/", (_, res) => res.send("Chat server active!"));

    // Setup Socket.io
    setupSocket(io);

    // Start server
    server.listen(config.port, () =>
      console.log(`Server running on port ${config.port}`)
    );
  } catch (err) {
    console.error("Server startup failed:", err);
  }
};

startServer();
