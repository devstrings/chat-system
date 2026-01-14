import express from "express";
import authRoutes from "./auth.js";
import userRoutes from "./user.js";
import messageRoutes from "./message.js";
import fileRoutes from "./file.js";
import groupRoutes from "./group.js"
import friendRoutes from "./friend.js";


export default function (app) {
  const router = express.Router();
  router.use("/auth", authRoutes);
  router.use("/users", userRoutes);
  router.use("/messages", messageRoutes);
  router.use("/file", fileRoutes);
  router.use("/friends", friendRoutes); 
  router.use("/groups", groupRoutes)
  app.use("/api", router);
}