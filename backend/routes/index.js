import express from "express";
import rateLimit from "express-rate-limit";

import authRoutes from "./auth.route.js";
import userRoutes from "./user.route.js";
import messageRoutes from "./message.route.js";
import callRoutes from "./call.route.js";
import fileRoutes from "./file.route.js";
import groupRoutes from "./group.route.js";
import friendRoutes from "./friend.route.js";
import statusRoutes from "./status.route.js";
import socketRoutes from "./socket.routes.js";

export { socketRoutes };


//  3. RATE LIMITING
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 500,
  message: "Too many requests, please try again later",
});

export default function (app) {
  const router = express.Router();
  router.use("/auth", authRoutes);
  router.use("/users", userRoutes);
  router.use("/messages", messageRoutes);
  router.use("/calls", callRoutes);
  router.use("/file", fileRoutes);
  router.use("/friends", friendRoutes);
  router.use("/groups", groupRoutes);
  router.use("/status", statusRoutes);
  app.use("/api", apiLimiter, router);
}
