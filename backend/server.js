import express from "express";
import http from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import swaggerUi from "swagger-ui-express";
import session from "express-session";

// GET CURRENT DIRECTORY
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// EXPLICITLY LOAD .env FILE
dotenv.config({ path: path.join(__dirname, '.env') });

// DEBUG - CHECK IF LOADED
// console.log("=== ENV DEBUG ===");
// console.log("ENV File Path:", path.join(__dirname, '.env'));
// console.log("Google Client ID:", process.env.GOOGLE_CLIENT_ID);
// console.log("Google Secret:", process.env.GOOGLE_CLIENT_SECRET);
// console.log("Session Secret:", process.env.SESSION_SECRET);
// console.log("================");

// DYNAMIC IMPORTS (after dotenv loaded)
const { default: passport } = await import("./config/passport.js");
const { config } = await import("./config/index.js");
const { default: connectDB } = await import("./config/db.js");
const { connectRedis } = await import("./config/redis.js");
const { default: setupRoutes } = await import("./routes/index.js");
const { setupSocket } = await import("./socket/index.js");

const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Connect to Redis
    await connectRedis();

    // Setup Express + Socket.io
    const app = express();
    const server = http.createServer(app);
    const io = new Server(server, {
      cors: { origin: "*", methods: ["GET", "POST"] },
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    app.use(cors());
    app.use(express.json());

    // ADD SESSION & PASSPORT
    app.use(
      session({
        secret: process.env.SESSION_SECRET || "your-secret-key",
        resave: false,
        saveUninitialized: false,
      })
    );
    app.use(passport.initialize());
    app.use(passport.session());

    // Swagger UI Setup
    const swaggerFilePath = path.join(__dirname, "openapi.json");
    if (fs.existsSync(swaggerFilePath)) {
      const swaggerDocument = JSON.parse(fs.readFileSync(swaggerFilePath, "utf-8"));
      app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
      console.log(`Swagger docs available at http://localhost:${config.port}/api-docs`);
    } else {
      console.warn("OpenAPI file not found. Swagger UI not available.");
    }

    // Setup routes
    setupRoutes(app);

    // Default route
    app.get("/", (_, res) => res.send("Chat server active!"));

    // Setup Socket.io
    setupSocket(io);

    // Start server
    server.listen(config.port, () =>
      console.log(`Server running on port 5000`)
    );
  } catch (err) {
    console.error("Server startup failed:", err);
  }
};

startServer();