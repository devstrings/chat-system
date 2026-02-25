import mongoose from "mongoose";

const callSchema = new mongoose.Schema({
  caller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },
  callType: {
    type: String,
    enum: ["audio", "video"],
    required: true
  },
  status: {
    type: String,
    enum: ["missed", "rejected", "completed", "cancelled"],
    default: "completed"
  },
  duration: {
    type: Number, // in seconds
    default: 0
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  endedAt: {
    type: Date
  }
}, { 
  timestamps: true 
});

callSchema.index({ caller: 1, createdAt: -1 });
callSchema.index({ receiver: 1, createdAt: -1 });
callSchema.index({ createdAt: -1 });

export default mongoose.model("Call", callSchema);