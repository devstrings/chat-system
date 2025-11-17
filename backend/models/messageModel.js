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
  
  receiver: { 
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
  }]
});

export default mongoose.model("Message", messageSchema);