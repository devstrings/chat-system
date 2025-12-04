import mongoose from "mongoose";

const blockedUserSchema = new mongoose.Schema({
  blocker: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  blocked: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  }
}, { timestamps: true });

// Prevent duplicate blocks
blockedUserSchema.index({ blocker: 1, blocked: 1 }, { unique: true });

export default mongoose.model("BlockedUser", blockedUserSchema);