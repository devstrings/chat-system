import mongoose from "mongoose";

const authProviderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },
  provider: {
    type: String,
    enum: ["local", "google", "facebook"],
    required: true
  },
  providerId: {
    type: String,
    sparse: true
  },
  providerData: {
    type: Object,
    default: {}
  },
  linkedAt: {
    type: Date,
    default: Date.now
  }
}, { 
  timestamps: true 
});

// Compound indexes
authProviderSchema.index({ userId: 1, provider: 1 }, { unique: true });
authProviderSchema.index({ provider: 1, providerId: 1 }, { unique: true, sparse: true });

export default mongoose.model("AuthProvider", authProviderSchema);