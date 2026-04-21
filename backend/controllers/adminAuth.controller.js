import asyncHandler from "express-async-handler";
import Manager from "#models/Manager";
import { adminAuthService } from "#services";

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  const result = await adminAuthService.loginManager(email.toLowerCase().trim(), password);
  return res.json(result);
});

export const me = asyncHandler(async (req, res) => {
  const manager = await Manager.findById(req.manager.id);
  if (!manager || !manager.isActive) {
    return res.status(401).json({ message: "Manager not found or inactive" });
  }
  return res.json({ manager: adminAuthService.sanitizeManager(manager) });
});
