import jwt from "jsonwebtoken";
import Manager from "#models/Manager";

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || "admin-super-secret-key";
const ADMIN_JWT_EXPIRES = "7d";

export const loginManager = async (email, password) => {
  const manager = await Manager.findOne({ email, isActive: true });
  if (!manager) throw new Error("Invalid credentials");

  const isMatch = await manager.comparePassword(password);
  if (!isMatch) throw new Error("Invalid credentials");

  manager.lastLogin = new Date();
  await manager.save();

  const token = jwt.sign(
    { id: manager._id, role: manager.role, permissions: manager.permissions },
    ADMIN_JWT_SECRET,
    { expiresIn: ADMIN_JWT_EXPIRES }
  );

  return { token, manager: sanitizeManager(manager) };
};

export const verifyManagerToken = (token) => {
  return jwt.verify(token, ADMIN_JWT_SECRET);
};

export const sanitizeManager = (manager) => ({
  _id: manager._id,
  name: manager.name,
  email: manager.email,
  role: manager.role,
  permissions: manager.permissions,
  avatar: manager.avatar,
  isActive: manager.isActive,
  lastLogin: manager.lastLogin,
  createdAt: manager.createdAt,
});
