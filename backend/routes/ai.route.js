import express from "express";
import { summarize, search, translate } from "#controllers/ai.controller";
import { verifyToken } from "#middleware/authMiddleware";
import { requireFeatureEnabled } from "#middleware/requireFeatureEnabled";

const router = express.Router();

router.post("/summarize", verifyToken, requireFeatureEnabled("summarize"), summarize);
router.post("/search", verifyToken, requireFeatureEnabled("smartSearch"), search);
router.post("/translate", verifyToken, requireFeatureEnabled("translate"), translate);

export default router;
