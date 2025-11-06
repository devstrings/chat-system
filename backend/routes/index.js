import express from "express";
import authRoutes from "./authRoutes.js";
import userRoutes from "./userRoutes.js";
import messageRoutes from "./messageRoutes.js";
import uploadRoutes from "./uploadRoutes.js";

const router = express.Router();

// Combine all routes here
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/messages", messageRoutes);
router.use("/upload", uploadRoutes);

export default router;
