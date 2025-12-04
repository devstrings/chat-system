import express from "express";
import authRoutes from "./authRoutes.js";
import userRoutes from "./userRoutes.js";
import messageRoutes from "./messageRoutes.js";
import fileRoutes from "./fileRoutes.js";
import friendRoutes from "./friendRoutes.js";

export default function (app) {
  const router = express.Router();
  router.use("/auth", authRoutes);
  router.use("/users", userRoutes);
  router.use("/messages", messageRoutes);
  router.use("/file", fileRoutes);
  router.use("/friends", friendRoutes); 
  app.use("/api", router);
}