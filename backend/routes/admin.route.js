import express from "express";
import {
  createManager,
  deleteManager,
  getSettings,
  getStats,
  listManagers,
  listUsers,
  suspendUser,
  updateAppSettings,
  updateManager,
  uploadLogo,
} from "#controllers/admin.controller";
import { uploadProfile } from "#config/multer";
import { requireManager, requirePermission } from "#middleware/requireManager";

const router = express.Router();

router.use(requireManager);

router.get("/settings", getSettings);
router.put("/settings", updateAppSettings);
router.post("/settings/logo", requirePermission("cms"), uploadProfile.single("logo"), uploadLogo);

router.get("/stats", requirePermission("stats"), getStats);

router.get("/managers", requirePermission("managers"), listManagers);
router.post("/managers", requirePermission("managers"), createManager);
router.patch("/managers/:id", requirePermission("managers"), updateManager);
router.delete("/managers/:id", requirePermission("managers"), deleteManager);

router.get("/users", requirePermission("users"), listUsers);
router.patch("/users/:id/suspend", requirePermission("users"), suspendUser);

export default router;
