import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema({
  participants: [
    { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    }
  ],
  lastMessage: { 
    type: String, 
    default: "" 
  },
  lastMessageTime: { 
    type: Date, 
    default: Date.now 
  },
  lastMessageSender: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User" 
  },
  unreadCount: {
    type: Number,
    default: 0
  },
  pinnedBy: [
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      pinnedAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  archivedBy: [
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      archivedAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Indexes
conversationSchema.index({ participants: 1 });
conversationSchema.index({ lastMessageTime: -1 }); 
conversationSchema.index({ "pinnedBy.userId": 1 });
conversationSchema.index({ "archivedBy.userId": 1 });

export default mongoose.model("Conversation", conversationSchema);