import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import hpp from "hpp";
import compression from "compression";
import swaggerUi from "swagger-ui-express";
import connectDB from "#config/db";
import { connectRedis } from "#config/redis";
import routes from "#routes";
import config from "#config/index";
import { setupSocket } from "./socket/index.js";
import swaggerSpec from "./swagger.js";
import errorHandler from "./middleware/errorHandler.js";


const app = express();
const server = http.createServer(app);

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: [
      config.frontend.url,
      "https://chat.masaajid.online",
      "http://localhost:5173",
    ],
    methods: ["GET", "POST"],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

app.set("io", io);

//  1. SECURITY HEADERS
app.use(
  helmet({
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:", "http:"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }),
);
//  2. CORS
app.use(
  cors({
    origin: function (origin, callback) {
      const allowedOrigins = [
        config.frontend.url,
        "http://localhost:3000",
        "http://localhost:5173",
        "http://chat_frontend:5173",
        "http://frontend:5173",
        "http://192.168.0.116:5173", 
        "https://chat.masaajid.online",
      ];

      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) === -1) {
        return callback(new Error("CORS policy violation"), false);
      }
      return callback(null, true);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

//  3. RATE LIMITING
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 500,
  message: "Too many requests, please try again later",
});
app.use("/api/", apiLimiter);

// Messages endpoint rate limiter
const messageLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // 60 messages per minute
  message: "Too many messages, slow down!",
});
app.use("/api/messages/send", messageLimiter);

//  4. COMPRESSION
app.use(compression());

//  5. BODY PARSER WITH LIMITS
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

//  6. MONGO SANITIZATION (Express 5 compatible - custom middleware)
app.use((req, res, next) => {
  const sanitize = (obj) => {
    if (!obj || typeof obj !== "object") return obj;

    for (const key in obj) {
      if (key.includes("$") || key.includes(".")) {
        delete obj[key];
      } else if (typeof obj[key] === "object") {
        sanitize(obj[key]);
      }
    }
    return obj;
  };

  if (req.body) sanitize(req.body);
  if (req.params) sanitize(req.params);

  next();
});

//  7. HTTP PARAMETER POLLUTION PROTECTION
app.use(hpp());

// Swagger UI
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
console.log(` Swagger docs: http://localhost:${config.port}/api-docs`);





// Static files
app.use("/uploads", express.static("uploads"));

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
    environment: config.nodeEnv,
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
  });
});
// Global error handler
app.use(errorHandler);
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
      console.log(` Server running on port ${config.port}`);
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
  console.log(" SIGTERM received, shutting down gracefully...");

  server.close(async () => {
    console.log(" HTTP server closed");

    try {
      const { redisClient } = await import("./config/redis.js");
      if (redisClient && redisClient.isOpen) {
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
