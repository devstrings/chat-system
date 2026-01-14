import mongoose from "mongoose";

const groupSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 100
  },
  description: { 
    type: String, 
    default: "",
    maxlength: 500
  },
  groupImage: { 
    type: String, 
    default: null 
  },
  creator: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  admins: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User" 
  }],
  members: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User" 
  }],
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
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  pinnedBy: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    pinnedAt: { type: Date, default: Date.now }
  }],
  archivedBy: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    archivedAt: { type: Date, default: Date.now }
  }],
  settings: {
    onlyAdminsCanSend: { 
      type: Boolean, 
      default: false 
    },
    onlyAdminsCanEditInfo: { 
      type: Boolean, 
      default: true 
    }
  }
});

groupSchema.index({ members: 1 });
groupSchema.index({ lastMessageTime: -1 });

export default mongoose.model("Group", groupSchema);