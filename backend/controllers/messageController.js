import Message from "../models/messageModel.js";
import Conversation from "../models/conversationModel.js";
import Attachment from "../models/Attachment.js"; 

// Get or create conversation between two users
export const getOrCreateConversation = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { otherUserId } = req.body;

    if (!otherUserId) {
      return res.status(400).json({ message: "Other user ID required" });
    }

    // Find existing conversation
    let conversation = await Conversation.findOne({
      participants: { $all: [currentUserId, otherUserId] }
    });

    // Create new if doesn't exist
    if (!conversation) {
      conversation = await Conversation.create({
        participants: [currentUserId, otherUserId]
      });
    }

    res.json(conversation);
  } catch (err) {
    console.error("Get/Create conversation error:", err);
    res.status(500).json({ message: "Failed to get conversation", error: err.message });
  }
};

// Get messages for a conversation
export const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const skip = parseInt(req.query.skip) || 0;

    const messages = await Message.find({ conversationId })
      .populate("sender", "username email")
      .populate({
        path: "attachments",
        select: "fileName fileType sizeInKilobytes serverFileName status"
      })
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit);

    // Transform attachments to match frontend expectations
    const transformedMessages = messages.map(msg => {
      const messageObj = msg.toObject();
      
      if (messageObj.attachments && messageObj.attachments.length > 0) {
        messageObj.attachments = messageObj.attachments.map(att => ({
          url: `/api/file/get/${att.serverFileName}`,
          filename: att.fileName,
          fileType: att.fileType,
          fileSize: att.sizeInKilobytes * 1024,
          attachmentId: att._id
        }));
      }
      
      return messageObj;
    });

    res.json(transformedMessages);
  } catch (err) {
    console.error("Get messages error:", err);
    res.status(500).json({ message: "Failed to fetch messages", error: err.message });
  }
};

// Get all conversations for current user
export const getUserConversations = async (req, res) => {
  try {
    const currentUserId = req.user.id;

    const conversations = await Conversation.find({
      participants: currentUserId
    })
      .populate("participants", "username email")
      .populate("lastMessageSender", "username") 
      .sort({ lastMessageTime: -1 });

    res.json(conversations);
  } catch (err) {
    console.error("Get conversations error:", err);
    res.status(500).json({ message: "Failed to fetch conversations", error: err.message });
  }
};

// Clear chat (delete all messages in conversation)
export const clearChat = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const currentUserId = req.user.id;

    // Verify user is part of conversation
    const conversation = await Conversation.findById(conversationId);
    
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    if (!conversation.participants.includes(currentUserId)) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // Delete all messages in this conversation
    const result = await Message.deleteMany({ conversationId });

    // Mark attachments as deleted instead of actually deleting
    await Attachment.updateMany(
      { conversationId },
      { status: 'deleted' }
    );

    // Update conversation
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: "",
      lastMessageTime: Date.now(),
      lastMessageSender: null 
    });

    res.json({ 
      message: "Chat cleared successfully", 
      deletedCount: result.deletedCount 
    });
  } catch (err) {
    console.error("Clear chat error:", err);
    res.status(500).json({ message: "Failed to clear chat", error: err.message });
  }
};