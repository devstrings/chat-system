import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import session from "express-session";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import swaggerUi from "swagger-ui-express";
import passport from "./config/passport.js";
import connectDB from "./config/db.js";
import { connectRedis } from "./config/redis.js";
import routes from "./routes/index.js";
import config from "./config/index.js"; 
import { setupSocket } from "./socket/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: config.frontend.url, 
    methods: ["GET", "POST"],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Middleware
app.use(cors({
  origin: config.frontend.url, 
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware
app.use(
  session({
    secret: config.jwtSecret, 
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: config.nodeEnv === "production", 
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());

// Static files
app.use("/uploads", express.static("uploads"));

// Swagger UI (optional)
const swaggerFilePath = path.join(__dirname, "openapi.json");
if (fs.existsSync(swaggerFilePath)) {
  try {
    const swaggerDocument = JSON.parse(fs.readFileSync(swaggerFilePath, "utf-8"));
    app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
    console.log(` Swagger docs: http://localhost:${config.port}/api-docs`);
  } catch (err) {
    console.error(" Swagger setup failed:", err.message);
  }
}

// API routes
routes(app);

// Socket.IO handler
setupSocket(io);

// Health check
app.get("/", (req, res) => {
  res.json({ 
    status: "OK",
    message: "Chat server active!",
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv 
  });
});

app.get("/health", (req, res) => {
  res.json({ 
    status: "OK", 
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv 
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(" Server error:", err);
  res.status(500).json({ 
    message: "Internal server error", 
    error: config.nodeEnv === "development" ? err.message : undefined 
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Start server
const startServer = async () => {
  try {
    await connectDB();
    await connectRedis();
    
    server.listen(config.port, () => { 
      console.log(`Server running on port ${config.port}`);
      console.log(` Environment: ${config.nodeEnv}`);
      console.log(` Frontend URL: ${config.frontend.url}`);
    });
  } catch (error) {
    console.error(" Failed to start server:", error);
    process.exit(1);
  }
};

startServer();

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down gracefully...");
  
  server.close(async () => {
    console.log(" HTTP server closed");
    
    try {
      if (redisClient.isOpen) {
        await redisClient.quit();
        console.log(" Redis connection closed");
      }
    } catch (err) {
      console.error(" Redis shutdown error:", err);
    }
    
    process.exit(0);
  });
});

export default app;