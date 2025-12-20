import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  conversationId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Conversation", 
    required: true 
  },
  sender: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
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
  
  // Delete functionality
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
  
  
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date
  },
  originalText: {
    type: String
  }
});

// Index for faster queries
messageSchema.index({ conversationId: 1, createdAt: 1 });
messageSchema.index({ sender: 1 });

export default mongoose.model("Message", messageSchema);