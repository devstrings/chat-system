import Message from "../models/message.js";
import Conversation from "../models/Conversation.js";
import Attachment from "../models/Attachment.js";
import Friendship from "../models/Friendship.js"; 

// Get or create conversation between two users
export const getOrCreateConversation = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { otherUserId } = req.body;

    if (!otherUserId) {
      return res.status(400).json({ message: "Other user ID required" });
    }

    // Check if they are friends
    const friendship = await Friendship.findOne({
      $or: [
        { user1: currentUserId, user2: otherUserId },
        { user1: otherUserId, user2: currentUserId }
      ]
    });

    if (!friendship) {
      return res.status(403).json({ message: "You must be friends to chat" });
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
    const currentUserId = req.user.id;
    const limit = parseInt(req.query.limit) || 50;
    const skip = parseInt(req.query.skip) || 0;

    // Verify conversation exists and user is participant
    const conversation = await Conversation.findById(conversationId);
    
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    if (!conversation.participants.includes(currentUserId)) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // Check if users are still friends
    const otherUserId = conversation.participants.find(
      p => p.toString() !== currentUserId
    );

    const friendship = await Friendship.findOne({
      $or: [
        { user1: currentUserId, user2: otherUserId },
        { user1: otherUserId, user2: currentUserId }
      ]
    });

    if (!friendship) {
      return res.status(403).json({ message: "You must be friends to view messages" });
    }

    const messages = await Message.find({ 
      conversationId,
      // Filter out messages deleted for current user
      $or: [
        { isDeleted: false },
        { deletedFor: { $ne: currentUserId } }
      ]
    })
      .populate("sender", "username email")
      .populate({
        path: "attachments",
        // Added duration & isVoiceMessage
        select: "fileName fileType sizeInKilobytes serverFileName status duration isVoiceMessage"
      })
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit);

    // Transform attachments to match frontend expectations
    const transformedMessages = messages.map(msg => {
      const messageObj = msg.toObject();
      
      // Add deleted info for frontend
      messageObj.isDeletedForMe = msg.deletedFor.includes(currentUserId);
      messageObj.isDeletedForEveryone = msg.deletedForEveryone;
      
      if (messageObj.attachments && messageObj.attachments.length > 0) {
        // Added duration & isVoiceMessage to transformation
        messageObj.attachments = messageObj.attachments.map(att => ({
          url: `/api/file/get/${att.serverFileName}`,
          filename: att.fileName,
          fileType: att.fileType,
          fileSize: att.sizeInKilobytes * 1024,
          attachmentId: att._id,
          duration: att.duration || 0,              
          isVoiceMessage: att.isVoiceMessage || false 
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

// DELETE MESSAGE FOR ME
export const deleteMessageForMe = async (req, res) => {
  try {
    const { messageId } = req.params;
    const currentUserId = req.user.id;

    console.log(" Delete for me - Message:", messageId, "User:", currentUserId);

    // Populate conversation to get participants
    const message = await Message.findById(messageId).populate('conversationId');

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    if (!message.conversationId) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    // Verify user is part of conversation
    const isParticipant = message.conversationId.participants.some(
      p => p.toString() === currentUserId
    );

    if (!isParticipant) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // Add user to deletedFor array
    if (!message.deletedFor.includes(currentUserId)) {
      message.deletedFor.push(currentUserId);
    }

    // If ALL participants deleted, mark as fully deleted
    const allDeleted = message.conversationId.participants.every(
      p => message.deletedFor.includes(p.toString())
    );

    if (allDeleted) {
      message.isDeleted = true;
      message.deletedAt = new Date();
    }

    await message.save();

    console.log(" Message deleted for user");

    res.json({ 
      message: "Message deleted for you",
      deletedFor: message.deletedFor,
      isDeleted: message.isDeleted
    });
  } catch (err) {
    console.error("Delete for me error:", err);
    res.status(500).json({ message: "Failed to delete message", error: err.message });
  }
};

// DELETE MESSAGE FOR EVERYONE
export const deleteMessageForEveryone = async (req, res) => {
  try {
    const { messageId } = req.params;
    const currentUserId = req.user.id;

    console.log(" Delete for everyone - Message:", messageId, "User:", currentUserId);

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    // Only sender can delete for everyone
    if (message.sender.toString() !== currentUserId) {
      return res.status(403).json({ message: "Only sender can delete for everyone" });
    }

    // Check time limit (5 minutes)
    const messageAge = Date.now() - new Date(message.createdAt).getTime();
    const fiveMinutes = 5 * 60 * 1000;

    if (messageAge > fiveMinutes) {
      return res.status(400).json({ 
        message: "Cannot delete for everyone after 5 minutes" 
      });
    }

    // Mark as deleted for everyone
    message.deletedForEveryone = true;
    message.isDeleted = true;
    message.deletedAt = new Date();
    message.text = ""; // Clear text
    message.attachments = []; // Clear attachments

    await message.save();

    console.log(" Message deleted for everyone");

    res.json({ 
      message: "Message deleted for everyone",
      deletedForEveryone: true
    });
  } catch (err) {
    console.error(" Delete for everyone error:", err);
    res.status(500).json({ message: "Failed to delete message", error: err.message });
  }
};

// BULK DELETE MESSAGES
export const bulkDeleteMessages = async (req, res) => {
  try {
    const { messageIds } = req.body;
    const currentUserId = req.user.id;

    console.log(" Bulk delete - Messages:", messageIds.length, "User:", currentUserId);

    if (!messageIds || messageIds.length === 0) {
      return res.status(400).json({ message: "No messages to delete" });
    }

    // Populate conversation for each message
    const messages = await Message.find({ _id: { $in: messageIds } })
      .populate('conversationId');

    let deletedCount = 0;

    for (const message of messages) {
      if (!message.conversationId) {
        continue; // Skip if conversation not found
      }

      // Verify user is participant
      const isParticipant = message.conversationId.participants.some(
        p => p.toString() === currentUserId
      );

      if (isParticipant) {
        if (!message.deletedFor.includes(currentUserId)) {
          message.deletedFor.push(currentUserId);
        }

        // If all participants deleted, mark as fully deleted
        const allDeleted = message.conversationId.participants.every(
          p => message.deletedFor.includes(p.toString())
        );

        if (allDeleted) {
          message.isDeleted = true;
          message.deletedAt = new Date();
        }

        await message.save();
        deletedCount++;
      }
    }

    console.log(" Bulk delete completed:", deletedCount, "messages");

    res.json({ 
      message: `${deletedCount} messages deleted`,
      deletedCount
    });
  } catch (err) {
    console.error(" Bulk delete error:", err);
    res.status(500).json({ message: "Failed to delete messages", error: err.message });
  }
};
// ==================== PIN CONVERSATION ====================
export const pinConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;

    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    // Check if user is participant
    const isParticipant = conversation.participants.some(
      (p) => p.toString() === userId
    );

    if (!isParticipant) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Check if already pinned
    const alreadyPinned = conversation.pinnedBy.some(
      (pin) => pin.userId.toString() === userId
    );

    if (alreadyPinned) {
      return res.status(400).json({ message: "Already pinned" });
    }

    // Check pin limit (max 3 like WhatsApp)
    const userPinnedCount = await Conversation.countDocuments({
      "pinnedBy.userId": userId,
    });

    if (userPinnedCount >= 3) {
      return res.status(400).json({ 
        message: "Maximum 3 chats can be pinned. Unpin a chat first." 
      });
    }

    // Add pin
    conversation.pinnedBy.push({
      userId: userId,
      pinnedAt: new Date(),
    });

    await conversation.save();

    console.log(` Conversation pinned: ${conversationId} by ${userId}`);

    res.json({
      message: "Conversation pinned successfully",
      conversation,
    });
  } catch (err) {
    console.error(" Pin conversation error:", err);
    res.status(500).json({ message: "Failed to pin conversation" });
  }
};

// ==================== UNPIN CONVERSATION ====================
export const unpinConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;

    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    // Remove pin
    conversation.pinnedBy = conversation.pinnedBy.filter(
      (pin) => pin.userId.toString() !== userId
    );

    await conversation.save();

    console.log(` Conversation unpinned: ${conversationId} by ${userId}`);

    res.json({
      message: "Conversation unpinned successfully",
      conversation,
    });
  } catch (err) {
    console.error(" Unpin conversation error:", err);
    res.status(500).json({ message: "Failed to unpin conversation" });
  }
};

// ==================== GET PINNED STATUS ====================
export const getPinnedConversations = async (req, res) => {
  try {
    const userId = req.user.id;

    const pinnedConversations = await Conversation.find({
      "pinnedBy.userId": userId,
    })
      .populate("participants", "username email profileImage")
      .sort({ "pinnedBy.pinnedAt": -1 });

    res.json(pinnedConversations);
  } catch (err) {
    console.error(" Get pinned conversations error:", err);
    res.status(500).json({ message: "Failed to fetch pinned conversations" });
  }
};