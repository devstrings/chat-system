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
import adminAuthRoutes from "./adminAuth.route.js";
import adminRoutes from "./admin.route.js";
import aiRoutes from "./ai.route.js";
import mcpRoutes from "./mcp.route.js";
import seederRoutes from "./seeder.route.js";
import basicAuth from "#middleware/basicAuth";
import verifyPAT from "#middleware/verifyPAT";


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
  router.use("/admin/auth", adminAuthRoutes);
  router.use("/admin", adminRoutes);
  router.use("/ai", aiRoutes);
  router.use("/seeder", basicAuth, seederRoutes);
  router.use("/mcp", basicAuth, verifyPAT,  mcpRoutes)
  app.use("/api", apiLimiter, router);
}
