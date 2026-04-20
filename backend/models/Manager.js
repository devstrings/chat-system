import mongoose from "mongoose";
import bcrypt from "bcrypt";

const ROLES = ["super_admin", "content_manager", "feature_manager", "user_manager"];

const PERMISSIONS_MAP = {
  super_admin:      ["cms", "ai_features", "api_keys", "managers", "users", "stats"],
  content_manager:  ["cms", "stats"],
  feature_manager:  ["ai_features", "api_keys", "stats"],
  user_manager:     ["users", "stats"],
};

const managerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ROLES,
      default: "content_manager",
    },
    permissions: {
      type: [String],
      default: function () {
        return PERMISSIONS_MAP[this.role] || [];
      },
    },
    avatar: {
      type: String,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Manager",
      default: null,
    },
  },
  { timestamps: true }
);

// Hash password before saving
managerSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password
managerSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Auto-set permissions based on role
managerSchema.pre("save", function (next) {
  if (this.isModified("role")) {
    this.permissions = PERMISSIONS_MAP[this.role] || [];
  }
  next();
});

export { ROLES, PERMISSIONS_MAP };
export default mongoose.model("Manager", managerSchema);
