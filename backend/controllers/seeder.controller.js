import asyncHandler from "express-async-handler";
import Manager, { PERMISSIONS_MAP } from "#models/Manager";

export const seedSuperAdmin = asyncHandler(async (req, res) => {
  const { name = "Super Admin", email, password } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json({ message: "email and password are required" });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const existing = await Manager.findOne({ email: normalizedEmail });

  if (existing) {
    existing.name = name;
    existing.role = "super_admin";
    existing.permissions = PERMISSIONS_MAP.super_admin;
    existing.isActive = true;
    existing.password = password;
    await existing.save();

    return res.json({
      message: "Super admin updated successfully",
      manager: {
        _id: existing._id,
        name: existing.name,
        email: existing.email,
        role: existing.role,
      },
    });
  }

  const manager = await Manager.create({
    name,
    email: normalizedEmail,
    password,
    role: "super_admin",
    permissions: PERMISSIONS_MAP.super_admin,
    isActive: true,
  });

  return res.status(201).json({
    message: "Super admin created successfully",
    manager: {
      _id: manager._id,
      name: manager.name,
      email: manager.email,
      role: manager.role,
    },
  });
});
