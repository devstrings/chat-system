import asyncHandler from "express-async-handler";
import Manager, { ROLES, PERMISSIONS_MAP } from "#models/Manager";
import User from "#models/User";
import Message from "#models/Message";
import Group from "#models/Group";
import { appSettingService } from "#services";

const hasPermission = (manager, permission) =>
  manager.role === "super_admin" || (manager.permissions || []).includes(permission);

const allowedKeysByPermission = {
  cms: ["branding", "maintenanceMode", "allowRegistrations", "maxGroupSize"],
  ai_features: ["aiFeatures", "aiProvider"],
};

const getTopLevelPatchedKeys = (patch) => Object.keys(patch || {});

export const getSettings = asyncHandler(async (_req, res) => {
  const settings = await getPublicSettings();
  res.json(settings);
});

export const updateAppSettings = asyncHandler(async (req, res) => {
  const patch = req.body || {};
  const keys = getTopLevelPatchedKeys(patch);
  if (!keys.length) {
    return res.status(400).json({ message: "No settings patch provided" });
  }

  for (const key of keys) {
    const cmsAllowed = allowedKeysByPermission.cms.includes(key);
    const aiAllowed = allowedKeysByPermission.ai_features.includes(key);

    if (cmsAllowed && !hasPermission(req.manager, "cms")) {
      return res.status(403).json({ message: "Requires 'cms' permission" });
    }
    if (aiAllowed && !hasPermission(req.manager, "ai_features")) {
      return res.status(403).json({ message: "Requires 'ai_features' permission" });
    }
  }

  const updated = await updateSettings(patch);
  const safe = updated.toObject();
  if (safe.aiProvider?.geminiApiKey) safe.aiProvider.geminiApiKey = "••••••••";
  if (safe.aiProvider?.openaiApiKey) safe.aiProvider.openaiApiKey = "••••••••";
  res.json(safe);
});

export const uploadLogo = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "Logo file is required" });
  }

  const logoUrl = `/uploads/profileImages/${req.file.filename}`;
  const updated = await updateSettings({ branding: { logoUrl } });
  const safe = updated.toObject();
  if (safe.aiProvider?.geminiApiKey) safe.aiProvider.geminiApiKey = "••••••••";
  if (safe.aiProvider?.openaiApiKey) safe.aiProvider.openaiApiKey = "••••••••";
  res.json({ logoUrl, settings: safe });
});

export const getStats = asyncHandler(async (_req, res) => {
  const [totalUsers, activeUsers, totalMessages, totalGroups] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ isSuspended: { $ne: true } }),
    Message.countDocuments(),
    Group.countDocuments(),
  ]);

  res.json({ totalUsers, activeUsers, totalMessages, totalGroups });
});

export const listManagers = asyncHandler(async (_req, res) => {
  const managers = await Manager.find()
    .select("-password")
    .sort({ createdAt: -1 })
    .populate("createdBy", "name email");
  res.json(managers);
});

export const createManager = asyncHandler(async (req, res) => {
  const { name, email, password, role = "content_manager" } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: "name, email and password are required" });
  }
  if (!ROLES.includes(role)) {
    return res.status(400).json({ message: "Invalid role" });
  }

  const existing = await Manager.findOne({ email: email.toLowerCase() });
  if (existing) return res.status(409).json({ message: "Manager email already exists" });

  const manager = await Manager.create({
    name,
    email: email.toLowerCase(),
    password,
    role,
    permissions: PERMISSIONS_MAP[role],
    createdBy: req.manager.id,
  });

  const safe = manager.toObject();
  delete safe.password;
  res.status(201).json(safe);
});

export const updateManager = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { role, isActive, permissions, name, avatar } = req.body;
  const manager = await Manager.findById(id);
  if (!manager) return res.status(404).json({ message: "Manager not found" });

  if (role) {
    if (!ROLES.includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }
    manager.role = role;
    manager.permissions = permissions || PERMISSIONS_MAP[role];
  } else if (permissions) {
    manager.permissions = permissions;
  }

  if (typeof isActive === "boolean") manager.isActive = isActive;
  if (typeof name === "string") manager.name = name;
  if (typeof avatar === "string") manager.avatar = avatar;

  await manager.save();
  const safe = manager.toObject();
  delete safe.password;
  res.json(safe);
});

export const deleteManager = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const manager = await Manager.findById(id);
  if (!manager) return res.status(404).json({ message: "Manager not found" });

  manager.isActive = false;
  await manager.save();
  res.json({ message: "Manager deactivated" });
});

export const listUsers = asyncHandler(async (req, res) => {
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 20);
  const skip = (page - 1) * limit;
  const search = (req.query.search || "").trim();

  const query = search
    ? {
        $or: [
          { username: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ],
      }
    : {};

  const [users, total] = await Promise.all([
    User.find(query)
      .select("username email profileImage createdAt isSuspended")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    User.countDocuments(query),
  ]);

  res.json({
    data: users,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

export const suspendUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { suspend } = req.body;
  if (typeof suspend !== "boolean") {
    return res.status(400).json({ message: "'suspend' boolean is required" });
  }

  const user = await User.findById(id);
  if (!user) return res.status(404).json({ message: "User not found" });

  user.isSuspended = suspend;
  await user.save();
  res.json({
    message: suspend ? "User suspended" : "User unsuspended",
    user: {
      _id: user._id,
      username: user.username,
      email: user.email,
      isSuspended: user.isSuspended,
    },
  });
});
