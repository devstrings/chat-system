// Middleware: requireManager — verifies the admin JWT
import { verifyManagerToken } from "#services/adminAuth";

export const requireManager = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No admin token provided" });
    }
    const token = authHeader.split(" ")[1];
    const decoded = verifyManagerToken(token);
    req.manager = decoded;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired admin token" });
  }
};

// Middleware factory: requirePermission("cms")
export const requirePermission = (permission) => (req, res, next) => {
  const permissions = req.manager?.permissions || [];
  if (!permissions.includes(permission)) {
    return res.status(403).json({ message: `Requires '${permission}' permission` });
  }
  next();
};
