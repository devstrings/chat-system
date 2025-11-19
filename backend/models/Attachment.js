import mongoose from "mongoose";

const attachmentSchema = new mongoose.Schema({
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Conversation",
    required: true,
    index: true
  },
  fileName: {
    type: String,
    required: true
  },
  fileHash: {
    type: String,
    required: true
  },
  sizeInKilobytes: {
    type: Number,
    required: true
  },
  fileType: {
    type: String,
    required: true
  },
  serverFileName: {
    type: String,
    required: true
  },
  uploadedBy: {  
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  status: {
    type: String,
    enum: ['uploading', 'completed', 'failed', 'deleted'],
    default: 'uploading'
  }
}, {
  timestamps: true
});

//  ADD THIS - Per-conversation deduplication
attachmentSchema.index({ conversationId: 1, fileHash: 1 }, { unique: true });

// Existing indexes
attachmentSchema.index({ conversationId: 1, createdAt: -1 });
attachmentSchema.index({ fileHash: 1 });

export default mongoose.model("Attachment", attachmentSchema);