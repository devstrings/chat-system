import express from "express";
import { login, me } from "#controllers/adminAuth.controller";
import { requireManager } from "#middleware/requireManager";

const router = express.Router();

router.post("/login", login);
router.get("/me", requireManager, me);

export default router;
