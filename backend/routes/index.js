import express from "express";
import authRoutes from "#routes/auth.route";
import userRoutes from "#routes/user.route";
import messageRoutes from "#routes/message.route";
import callRoutes from "#routes/call.route";
import fileRoutes from "#routes/file.route";
import groupRoutes from "#routes/group.route";
import friendRoutes from "#routes/friend.route";
import statusRoutes from "#routes/status.route";


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
  app.use("/api", router);
}
