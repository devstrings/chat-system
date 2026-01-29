import express from "express";
import authRoutes from "./auth.route.js";
import userRoutes from "./user.route.js";
import messageRoutes from "./message.route.js";
import fileRoutes from "./file.route.js";
import groupRoutes from "./group.route.js"
import friendRoutes from "./friend.route.js";
import statusRoutes from "./status.route.js";

export default function (app) {
  const router = express.Router();
  router.use("/auth", authRoutes);
  router.use("/users", userRoutes);
  router.use("/messages", messageRoutes);
  router.use("/file", fileRoutes);
  router.use("/friends", friendRoutes); 
  router.use("/groups", groupRoutes);
   router.use("/status", statusRoutes);
  app.use("/api", router);
}