import * as messageService from "../services/message.service.js";
import Message from "../models/Message.js";

// GET OR CREATE CONVERSATION CONTROLLER
export const getOrCreateConversation = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { otherUserId, skipCreate } = req.body;

    // Check if conversation exists
    const existingConversation = await messageService.findExistingConversation(currentUserId, otherUserId);
    const isNewConversation = !existingConversation && !skipCreate;

    // Service call
    const conversation = await messageService.processGetOrCreateConversation(currentUserId, otherUserId, skipCreate);

    if (!conversation && skipCreate) {
      return res.status(404).json({ 
        message: "No conversation found",
        exists: false 
      });
    }

    // Emit socket event for NEW conversation only
    if (isNewConversation && conversation) {
      const io = req.app.get("io");
      if (io) {
        console.log("Emitting newConversation event:", {
          conversationId: conversation._id,
          participants: [currentUserId, otherUserId]
        });
        
        io.to(currentUserId).emit("newConversation", {
          conversationId: conversation._id.toString(),
          otherUserId,
        });
        
        io.to(otherUserId).emit("newConversation", {
          conversationId: conversation._id.toString(),
          otherUserId: currentUserId,
        });
      }
    }

    res.json(conversation);
  } catch (err) {
    console.error("Get/Create conversation error:", err);
    res.status(500).json({ message: "Failed to get conversation", error: err.message });
  }
};

// SEND MESSAGE CONTROLLER
export const sendMessage = async (req, res) => {
  try {
    const { conversationId, text, attachments } = req.body;
    const currentUserId = req.user.id;

    console.log("Send message request:", {
      conversationId,
      hasText: !!text,
      attachmentsCount: attachments?.length || 0,
      userId: currentUserId
    });

    const conversation = req.validatedConversation; 

    // Extract only attachment IDs
    const attachmentIds = attachments?.map(att => att.attachmentId) || [];

    // Create message
    const message = await Message.create({
      conversationId,
      sender: currentUserId,
      text: text || "",
      attachments: attachmentIds, 
      status: "sent",
      isGroupMessage: false,
    });

    // Populate sender info
    await message.populate("sender", "username email profileImage");
    await message.populate({
      path: "attachments",
      select: "fileName fileType sizeInKilobytes serverFileName duration isVoiceMessage",
    });

    // Update conversation last message
    conversation.lastMessage = text || "📎 Attachment";
    conversation.lastMessageTime = new Date();
    conversation.lastMessageSender = currentUserId;
    await conversation.save();

    console.log("Message created:", message._id);

    // Transform message for response
    const messageObj = message.toObject();
    if (messageObj.attachments && messageObj.attachments.length > 0) {
      messageObj.attachments = messageObj.attachments.map((att) => ({
        url: `/api/file/get/${att.serverFileName}`,
        filename: att.fileName,
        fileType: att.fileType,
        fileSize: att.sizeInKilobytes * 1024,
        attachmentId: att._id,
        duration: att.duration || 0,
        isVoiceMessage: att.isVoiceMessage || false,
      }));
    }

    // Emit socket event
    const io = req.app.get("io");
    if (io) {
      const otherUserId = conversation.participants.find(
        (p) => p.toString() !== currentUserId
      );

      io.to(otherUserId.toString()).emit("receiveMessage", messageObj);
      
      console.log("Socket event sent to:", otherUserId);
    }

    res.json(messageObj);

  } catch (err) {
    console.error("Send message error:", err);
    res.status(500).json({ 
      message: "Failed to send message", 
      error: err.message 
    });
  }
};

// GET MESSAGES CONTROLLER
export const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const currentUserId = req.user.id;
    const limit = parseInt(req.query.limit) || 50;
    const skip = parseInt(req.query.skip) || 0;

    console.log(" GET MESSAGES REQUEST:", {
      conversationId,
      currentUserId,
      limit,
      skip
    });

    const conversation = req.validatedConversation;

    console.log(" Validated conversation:", {
      id: conversation._id,
      participants: conversation.participants.map(p => p.toString()),
      deletedBy: conversation.deletedBy
    });

    const wasDeletedByUser = conversation.deletedBy?.some(
      d => d.userId?.toString() === currentUserId.toString()
    );

    if (wasDeletedByUser) {
      console.log(" Conversation was deleted by user");
      return res.status(404).json({ message: "Conversation not found" });
    }

    const otherUserId = conversation.participants
      .find(p => p.toString() !== currentUserId.toString())
      ?.toString();
    
    console.log(" Checking friendship:", {
      currentUserId: currentUserId.toString(),
      otherUserId: otherUserId
    });

    const friendship = await messageService.checkFriendship(
      currentUserId.toString(), 
      otherUserId
    );
    
    console.log(" Friendship check result:", {
      found: !!friendship,
      status: friendship?.status || 'not found'
    });

    if (!friendship) {
      console.log(" Not friends");
      return res.status(403).json({ message: "Not friends" });
    }

    console.log(" Friendship validated");

    // Service call
    const messages = await messageService.fetchMessages(
      conversationId, 
      currentUserId, 
      limit, 
      skip
    );
    
    const transformedMessages = messageService.transformMessages(
      messages, 
      currentUserId
    );

    console.log(` Returning ${transformedMessages.length} messages`);
    res.json(transformedMessages);
  } catch (err) {
    console.error(" Get messages error:", err);
    res.status(500).json({ 
      message: "Failed to fetch messages", 
      error: err.message 
    });
  }
};

// GET USER CONVERSATIONS CONTROLLER
export const getUserConversations = async (req, res) => {
  try {
    const currentUserId = req.user.id;

    // Service call
    const conversations = await messageService.fetchUserConversations(currentUserId);

    res.json(conversations);
  } catch (err) {
    console.error("Get conversations error:", err);
    res.status(500).json({ message: "Failed to fetch conversations", error: err.message });
  }
};

// CLEAR CHAT CONTROLLER
export const clearChat = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const currentUserId = req.user.id;

    // Service call
    const result = await messageService.processClearChat(conversationId, currentUserId);

    // Get socket.io instance and emit
    const io = req.app.get("io");

    if (io) {
      console.log("EMITTING chatCleared EVENT");
      console.log("Conversation ID:", conversationId.toString());
      console.log("Participants:", result.participants.map(p => p.toString()));
      console.log("Cleared by:", currentUserId);
      
      console.log(`Emitting ONLY to user who cleared: ${currentUserId}`);
      
      io.to(currentUserId).emit("chatCleared", {
        conversationId: conversationId.toString(),
        clearedBy: currentUserId,
        clearedFor: currentUserId,
        action: "clearedForMe"
      });
      
      console.log("Socket event emitted to clearing user only");
    } else {
      console.error("Socket.IO not available!");
    }
    console.log(" Socket event emitted to clearing user only");

io.to(currentUserId).emit("conversationUpdated", {
  conversationId: conversationId.toString(),
  lastMessage: "",
  lastMessageTime: Date.now()
});

console.log(" Sent sidebar update for cleared chat");
    
    res.json({
      success: result.success,
      action: result.action,
      message: result.message,
      clearedCount: result.clearedCount,
      conversationId: result.conversationId,
    });

  } catch (err) {
    console.error("CLEAR CHAT ERROR:", err);
    console.error("Stack:", err.stack);
    res.status(500).json({
      success: false,
      message: "Failed to clear chat",
      error: err.message,
    });
  }
};

// DELETE CONVERSATION CONTROLLER
export const deleteConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const currentUserId = req.user.id;
    const { otherUserId } = req.body;

    // Service call
    const result = await messageService.processDeleteConversation(conversationId, currentUserId, otherUserId);

    // Emit socket event ONLY to current user
    const io = req.app.get("io");
    if (io) {
      const userSocket = [...io.sockets.sockets.values()].find(
        (s) => s.user && s.user.id === currentUserId
      );

      if (userSocket) {
        userSocket.emit("conversationDeleted", {
          conversationId: result.conversationId.toString(),
          deletedBy: currentUserId,
          otherUserId: result.userId,
        });
        console.log("Socket event sent ONLY to deleting user");
      }
    }

    res.json(result);

  } catch (err) {
    console.error("Delete conversation error:", err);
    
    if (err.message === "No conversation found to delete") {
      return res.status(404).json({
        success: false,
        message: err.message,
      });
    }
    
    res.status(500).json({
      success: false,
      message: "Failed to delete conversation",
      error: err.message,
    });
  }
};

// DELETE MESSAGE FOR ME CONTROLLER
export const deleteMessageForMe = async (req, res) => {
  try {
    const { messageId } = req.params;
    const currentUserId = req.user.id;

    // Service call
    const result = await messageService.processDeleteMessageForMe(messageId, currentUserId);

    res.json(result);
  } catch (err) {
    console.error("Delete for me error:", err);
    res.status(500).json({ message: "Failed to delete message", error: err.message });
  }
};

// DELETE MESSAGE FOR EVERYONE CONTROLLER
export const deleteMessageForEveryone = async (req, res) => {
  try {
    const { messageId } = req.params;

    // Service call
    const result = await messageService.processDeleteMessageForEveryone(messageId);

    console.log("Message deleted for everyone");
    res.json(result);
  } catch (err) {
    console.error("Delete for everyone error:", err);
    res.status(500).json({ message: "Failed to delete message", error: err.message });
  }
};

// BULK DELETE MESSAGES CONTROLLER
export const bulkDeleteMessages = async (req, res) => {
  try {
    const { messageIds } = req.body;
    const currentUserId = req.user.id;

    // Service call
    const result = await messageService.processBulkDeleteMessages(messageIds, currentUserId);

    res.json(result);
  } catch (err) {
    console.error("Bulk delete error:", err);
    res.status(500).json({ message: "Failed to delete messages", error: err.message });
  }
};

// PIN CONVERSATION CONTROLLER
export const pinConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;

    // Service call
    const result = await messageService.processPinConversation(conversationId, userId);

    res.json(result);
  } catch (err) {
    console.error("Pin conversation error:", err);
    res.status(500).json({ message: "Failed to pin conversation" });
  }
};

// UNPIN CONVERSATION CONTROLLER
export const unpinConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;

    // Service call
    const result = await messageService.processUnpinConversation(conversationId, userId);

    res.json(result);
  } catch (err) {
    console.error("Unpin conversation error:", err);
    res.status(500).json({ message: "Failed to unpin conversation" });
  }
};

// GET PINNED CONVERSATIONS CONTROLLER
export const getPinnedConversations = async (req, res) => {
  try {
    const userId = req.user.id;

    // Service call
    const pinnedConversations = await messageService.fetchPinnedConversations(userId);

    res.json(pinnedConversations);
  } catch (err) {
    console.error("Get pinned conversations error:", err);
    res.status(500).json({ message: "Failed to fetch pinned conversations" });
  }
};

// ARCHIVE CONVERSATION CONTROLLER
export const archiveConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;

    // Service call
    const result = await messageService.processArchiveConversation(conversationId, userId);

    res.json(result);
  } catch (err) {
    console.error("Archive conversation error:", err);
    res.status(500).json({ message: "Failed to archive conversation" });
  }
};

// UNARCHIVE CONVERSATION CONTROLLER
export const unarchiveConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;

    // Service call
    const result = await messageService.processUnarchiveConversation(conversationId, userId);

    res.json(result);
  } catch (err) {
    console.error("Unarchive conversation error:", err);
    res.status(500).json({ message: "Failed to unarchive conversation" });
  }
};

// GET ARCHIVED CONVERSATIONS CONTROLLER
export const getArchivedConversations = async (req, res) => {
  try {
    const userId = req.user.id;

    // Service call
    const archivedConversations = await messageService.fetchArchivedConversations(userId);

    res.json(archivedConversations);
  } catch (err) {
    console.error("Get archived conversations error:", err);
    res.status(500).json({ message: "Failed to fetch archived conversations" });
  }
};

// GET GROUP MESSAGES CONTROLLER
export const getGroupMessages = async (req, res) => {
  try {
    const { groupId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const skip = parseInt(req.query.skip) || 0;

    // Service call
    const messages = await messageService.fetchGroupMessages(groupId, limit, skip);
    const transformedMessages = messageService.transformGroupMessages(messages);

    console.log(`Fetched ${transformedMessages.length} group messages`);
    res.json(transformedMessages);
  } catch (err) {
    console.error("Get group messages error:", err);
    res.status(500).json({ message: "Failed to fetch messages", error: err.message });
  }
};

// EDIT MESSAGE CONTROLLER
export const editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { text } = req.body;

    // Service call
    const result = await messageService.processEditMessage(messageId, text);

    res.json(result);
  } catch (err) {
    console.error("Edit message error:", err);
    res.status(500).json({ 
      message: "Failed to edit message", 
      error: err.message 
    });
  }
};