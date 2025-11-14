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
    required: true,
    
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
  status: {
    type: String,
    enum: ['uploading', 'completed', 'failed', 'deleted'],
    default: 'uploading'
  }
}, {
  timestamps: true
});

// Index for faster queries
attachmentSchema.index({ conversationId: 1, createdAt: -1 });
attachmentSchema.index({ fileHash: 1 });

export default mongoose.model("Attachment", attachmentSchema);