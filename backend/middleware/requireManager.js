// Middleware: requireManager — verifies the admin JWT
import { adminAuthService } from "#services";
import Manager from "#models/Manager";
import asyncHandler from "express-async-handler";

export const requireManager = asyncHandler(async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No admin token provided" });
    }
    const token = authHeader.split(" ")[1];
    const decoded = verifyManagerToken(token);
    const manager = await Manager.findById(decoded.id).select("-password");
    if (!manager || !manager.isActive) {
      return res.status(401).json({ message: "Manager not found or inactive" });
    }

    req.manager = {
      id: manager._id.toString(),
      role: manager.role,
      permissions: manager.permissions || [],
      email: manager.email,
      name: manager.name,
    };
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired admin token" });
  }
});

// Middleware factory: requirePermission("cms")
export const requirePermission = (permission) => (req, res, next) => {
  const permissions = req.manager?.permissions || [];
  if (!permissions.includes(permission)) {
    return res.status(403).json({ message: `Requires '${permission}' permission` });
  }
  next();
};
