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
    url: { type: String, required: true },
    filename: { type: String, required: true },
    fileType: { type: String },
    fileSize: { type: Number },
  }],
  //   Message status
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read'],
    default: 'sent'
  },
  //  Delivery and read timestamps
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