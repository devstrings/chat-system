import express from "express";
import { seedSuperAdmin } from "#controllers/seeder.controller";

const router = express.Router();

router.post("/superadmin", seedSuperAdmin);

export default router;
