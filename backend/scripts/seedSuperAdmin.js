import dotenv from "dotenv";
import mongoose from "mongoose";
import Manager, { PERMISSIONS_MAP } from "../models/Manager.js";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;
const SUPER_ADMIN_NAME = process.env.SUPER_ADMIN_NAME || "Super Admin";
const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL;
const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD;

if (!MONGO_URI) {
  console.error("MONGO_URI is required.");
  process.exit(1);
}

if (!SUPER_ADMIN_EMAIL || !SUPER_ADMIN_PASSWORD) {
  console.error("SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD are required.");
  process.exit(1);
}

const run = async () => {
  await mongoose.connect(MONGO_URI);

  const email = SUPER_ADMIN_EMAIL.toLowerCase().trim();
  const existing = await Manager.findOne({ email });

  if (existing) {
    existing.name = SUPER_ADMIN_NAME;
    existing.role = "super_admin";
    existing.permissions = PERMISSIONS_MAP.super_admin;
    existing.isActive = true;
    if (SUPER_ADMIN_PASSWORD) {
      existing.password = SUPER_ADMIN_PASSWORD;
    }
    await existing.save();
    console.log(`Updated existing super admin: ${email}`);
  } else {
    await Manager.create({
      name: SUPER_ADMIN_NAME,
      email,
      password: SUPER_ADMIN_PASSWORD,
      role: "super_admin",
      permissions: PERMISSIONS_MAP.super_admin,
      isActive: true,
    });
    console.log(`Created super admin: ${email}`);
  }

  await mongoose.disconnect();
};

run()
  .then(() => {
    console.log("Seeding finished.");
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("Seeding failed:", error);
    await mongoose.disconnect();
    process.exit(1);
  });
