import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  conversationId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Conversation", 
    required: false
  },
  sender: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  
  isGroupMessage: {
    type: Boolean,
    default: false
  },
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Group"
  },
  text: { 
    type: String,
    default: "" 
  },

  attachments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Attachment"
  }],
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read'],
    default: 'sent'
  },
  deliveredAt: { 
    type: Date 
  },
  readAt: { 
    type: Date 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  readBy: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User" 
  }],
  
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedFor: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }],
  deletedForEveryone: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date
  },
  
  isCallRecord: {
    type: Boolean,
    default: false
  },
  callRecordId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Call"
  },
  callStatus: {
    type: String,
    enum: ["missed", "rejected", "completed", "cancelled"],
  },
  callType: {
    type: String,
    enum: ["audio", "video"],
  },
  callDuration: {
    type: Number,
    default: 0
  },
  callCaller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  callReceiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date
  },
  originalText: {
    type: String
  },
  editHistory: [{
    text: String,
    editedAt: {
      type: Date,
      default: Date.now
    }
  }]
});

// Index for faster queries
messageSchema.index({ conversationId: 1, createdAt: 1 });
messageSchema.index({ sender: 1 });

export default mongoose.model("Message", messageSchema);