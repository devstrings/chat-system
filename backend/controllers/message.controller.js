
import * as messageService from "../services/message.service.js";
import * as messageValidation from "../validations/message.validation.js";

// GET OR CREATE CONVERSATION CONTROLLER
export const getOrCreateConversation = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { otherUserId, skipCreate } = req.body;

    // Validation
    const validation = messageValidation.validateOtherUserId(otherUserId);
    if (!validation.isValid) {
      return res.status(400).json({ message: validation.message });
    }

    // Check friendship
    const friendship = await messageService.checkFriendship(currentUserId, otherUserId);
    const friendshipValidation = messageValidation.validateFriendship(friendship);
    if (!friendshipValidation.isValid) {
      return res.status(friendshipValidation.statusCode).json({ message: friendshipValidation.message });
    }

    //  Check if conversation already exists
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

    //  Emit socket event for NEW conversation only
    if (isNewConversation && conversation) {
      const io = req.app.get("io");
      if (io) {
        console.log(" Emitting newConversation event:", {
          conversationId: conversation._id,
          participants: [currentUserId, otherUserId]
        });
        
        // Emit to both users
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
// GET MESSAGES CONTROLLER
export const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const currentUserId = req.user.id;
    const limit = parseInt(req.query.limit) || 50;
    const skip = parseInt(req.query.skip) || 0;

    // Verify conversation exists and user is participant
    const conversation = await messageService.fetchConversationById(conversationId);

    const convValidation = messageValidation.validateConversationExists(conversation);
    if (!convValidation.isValid) {
      return res.status(convValidation.statusCode).json({ message: convValidation.message });
    }

    const participantValidation = messageValidation.validateIsParticipant(conversation, currentUserId);
    if (!participantValidation.isValid) {
      return res.status(participantValidation.statusCode).json({ message: participantValidation.message });
    }

    // Check if users are still friends
    const otherUserId = messageService.findOtherUserInConversation(conversation, currentUserId);
    const friendship = await messageService.checkFriendship(currentUserId, otherUserId);
    
    const friendshipValidation = messageValidation.validateFriendshipForMessages(friendship);
    if (!friendshipValidation.isValid) {
      return res.status(friendshipValidation.statusCode).json({ message: friendshipValidation.message });
    }

    // Service call
    const messages = await messageService.fetchMessages(conversationId, currentUserId, limit, skip);
    const transformedMessages = messageService.transformMessages(messages, currentUserId);

    res.json(transformedMessages);
  } catch (err) {
    console.error("Get messages error:", err);
    res.status(500).json({ message: "Failed to fetch messages", error: err.message });
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

    const conversation = await messageService.fetchConversationById(conversationId);

    // Validation
    const convValidation = messageValidation.validateConversationExists(conversation);
    if (!convValidation.isValid) {
      console.log(" Conversation not found");
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    const participantValidation = messageValidation.validateIsParticipant(conversation, currentUserId);
    if (!participantValidation.isValid) {
      console.log(" User not participant");
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    // Service call
    const result = await messageService.processClearChat(conversationId, currentUserId);

    //  GET SOCKET.IO INSTANCE AND EMIT
    const io = req.app.get("io");

    if (io) {
      console.log("EMITTING chatCleared EVENT");
      console.log(" Conversation ID:", conversationId.toString());
      console.log(" Participants:", result.participants.map(p => p.toString()));
      console.log(" Cleared by:", currentUserId);
      
      console.log(` Emitting ONLY to user who cleared: ${currentUserId}`);
      
      io.to(currentUserId).emit("chatCleared", {
        conversationId: conversationId.toString(),
        clearedBy: currentUserId,
        clearedFor: currentUserId,
        action: "clearedForMe"
      });
      
      console.log(" Socket event emitted to clearing user only");
    } else {
      console.error(" Socket.IO not available!");
    }
    
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

    //  Emit socket event ONLY to current user
    const io = req.app.get("io");
    if (io) {
      // Find current user's socket
      const userSocket = [...io.sockets.sockets.values()].find(
        (s) => s.user && s.user.id === currentUserId
      );

      if (userSocket) {
        userSocket.emit("conversationDeleted", {
          conversationId: result.conversationId.toString(),
          deletedBy: currentUserId,
          otherUserId: result.userId,
        });
        console.log(" Socket event sent ONLY to deleting user");
      }
    }

    res.json(result);

  } catch (err) {
    console.error(" Delete conversation error:", err);
    
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

    // Fetch message
    const message = await messageService.fetchMessageWithConversation(messageId);

    // Validation
    const messageValidationResult = messageValidation.validateMessageExists(message);
    if (!messageValidationResult.isValid) {
      return res.status(messageValidationResult.statusCode).json({ message: messageValidationResult.message });
    }

    const convValidation = messageValidation.validateMessageConversationExists(message);
    if (!convValidation.isValid) {
      return res.status(convValidation.statusCode).json({ message: convValidation.message });
    }

    const participantValidation = messageValidation.validateIsMessageParticipant(message, currentUserId);
    if (!participantValidation.isValid) {
      return res.status(participantValidation.statusCode).json({ message: participantValidation.message });
    }

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
    const currentUserId = req.user.id;

    const message = await messageService.fetchMessageById(messageId);

    // Validation
    const messageValidationResult = messageValidation.validateMessageExists(message);
    if (!messageValidationResult.isValid) {
      return res.status(messageValidationResult.statusCode).json({ message: messageValidationResult.message });
    }

    const senderValidation = messageValidation.validateIsSender(message, currentUserId);
    if (!senderValidation.isValid) {
      return res.status(senderValidation.statusCode).json({ message: senderValidation.message });
    }

    const timeLimitValidation = messageValidation.validateDeleteTimeLimit(message);
    if (!timeLimitValidation.isValid) {
      return res.status(timeLimitValidation.statusCode).json({ message: timeLimitValidation.message });
    }

    // Service call
    const result = await messageService.processDeleteMessageForEveryone(messageId);

    console.log(" Message deleted for everyone");
    res.json(result);
  } catch (err) {
    console.error(" Delete for everyone error:", err);
    res.status(500).json({ message: "Failed to delete message", error: err.message });
  }
};

// BULK DELETE MESSAGES CONTROLLER
export const bulkDeleteMessages = async (req, res) => {
  try {
    const { messageIds } = req.body;
    const currentUserId = req.user.id;

    // Validation
    const validation = messageValidation.validateBulkDeleteMessages(messageIds);
    if (!validation.isValid) {
      return res.status(validation.statusCode).json({ message: validation.message });
    }

    // Service call
    const result = await messageService.processBulkDeleteMessages(messageIds, currentUserId);

    res.json(result);
  } catch (err) {
    console.error(" Bulk delete error:", err);
    res.status(500).json({ message: "Failed to delete messages", error: err.message });
  }
};

// PIN CONVERSATION CONTROLLER
export const pinConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;

    const conversation = await messageService.fetchConversationById(conversationId);

    // Validation
    const convValidation = messageValidation.validateConversationExists(conversation);
    if (!convValidation.isValid) {
      return res.status(convValidation.statusCode).json({ message: convValidation.message });
    }

    const participantValidation = messageValidation.validateIsConversationParticipant(conversation, userId);
    if (!participantValidation.isValid) {
      return res.status(participantValidation.statusCode).json({ message: participantValidation.message });
    }

    const pinnedValidation = messageValidation.validateNotAlreadyPinnedConversation(conversation, userId);
    if (!pinnedValidation.isValid) {
      return res.status(pinnedValidation.statusCode).json({ message: pinnedValidation.message });
    }

    // Check pin limit (max 3 like WhatsApp)
    const userPinnedCount = await messageService.checkUserConversationPinCount(userId);
    const pinLimitValidation = messageValidation.validatePinLimitConversation(userPinnedCount);
    if (!pinLimitValidation.isValid) {
      return res.status(pinLimitValidation.statusCode).json({ message: pinLimitValidation.message });
    }

    // Service call
    const result = await messageService.processPinConversation(conversationId, userId);

    res.json(result);
  } catch (err) {
    console.error(" Pin conversation error:", err);
    res.status(500).json({ message: "Failed to pin conversation" });
  }
};

//  UNPIN CONVERSATION CONTROLLER
export const unpinConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;

    const conversation = await messageService.fetchConversationById(conversationId);

    // Validation
    const convValidation = messageValidation.validateConversationExists(conversation);
    if (!convValidation.isValid) {
      return res.status(convValidation.statusCode).json({ message: convValidation.message });
    }

    // Service call
    const result = await messageService.processUnpinConversation(conversationId, userId);

    res.json(result);
  } catch (err) {
    console.error(" Unpin conversation error:", err);
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
    console.error(" Get pinned conversations error:", err);
    res.status(500).json({ message: "Failed to fetch pinned conversations" });
  }
};

// ARCHIVE CONVERSATION CONTROLLER
export const archiveConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;

    const conversation = await messageService.fetchConversationById(conversationId);

    // Validation
    const convValidation = messageValidation.validateConversationExists(conversation);
    if (!convValidation.isValid) {
      return res.status(convValidation.statusCode).json({ message: convValidation.message });
    }

    const participantValidation = messageValidation.validateIsConversationParticipant(conversation, userId);
    if (!participantValidation.isValid) {
      return res.status(participantValidation.statusCode).json({ message: participantValidation.message });
    }

    const archivedValidation = messageValidation.validateNotAlreadyArchived(conversation, userId);
    if (!archivedValidation.isValid) {
      return res.status(archivedValidation.statusCode).json({ message: archivedValidation.message });
    }

    // Service call
    const result = await messageService.processArchiveConversation(conversationId, userId);

    res.json(result);
  } catch (err) {
    console.error(" Archive conversation error:", err);
    res.status(500).json({ message: "Failed to archive conversation" });
  }
};

// UNARCHIVE CONVERSATION CONTROLLER
export const unarchiveConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;

    const conversation = await messageService.fetchConversationById(conversationId);

    // Validation
    const convValidation = messageValidation.validateConversationExists(conversation);
    if (!convValidation.isValid) {
      return res.status(convValidation.statusCode).json({ message: convValidation.message });
    }

    // Service call
    const result = await messageService.processUnarchiveConversation(conversationId, userId);

    res.json(result);
  } catch (err) {
    console.error("Unarchive conversation error:", err);
    res.status(500).json({ message: "Failed to unarchive conversation" });
  }
};

//  GET ARCHIVED CONVERSATIONS CONTROLLER
export const getArchivedConversations = async (req, res) => {
  try {
    const userId = req.user.id;

    // Service call
    const archivedConversations = await messageService.fetchArchivedConversations(userId);

    res.json(archivedConversations);
  } catch (err) {
    console.error(" Get archived conversations error:", err);
    res.status(500).json({ message: "Failed to fetch archived conversations" });
  }
};

// GET GROUP MESSAGES CONTROLLER
export const getGroupMessages = async (req, res) => {
  try {
    const { groupId } = req.params;
    const currentUserId = req.user.id;
    const limit = parseInt(req.query.limit) || 50;
    const skip = parseInt(req.query.skip) || 0;

    // Verify user is group member
    const group = await messageService.fetchGroupById(groupId);

    // Validation
    const groupValidation = messageValidation.validateGroupExists(group);
    if (!groupValidation.isValid) {
      return res.status(groupValidation.statusCode).json({ message: groupValidation.message });
    }

    const memberValidation = messageValidation.validateIsGroupMember(group, currentUserId);
    if (!memberValidation.isValid) {
      return res.status(memberValidation.statusCode).json({ message: memberValidation.message });
    }

    // Service call
    const messages = await messageService.fetchGroupMessages(groupId, limit, skip);
    const transformedMessages = messageService.transformGroupMessages(messages);

    console.log(`Fetched ${transformedMessages.length} group messages`);
    res.json(transformedMessages);
  } catch (err) {
    console.error(" Get group messages error:", err);
    res.status(500).json({ message: "Failed to fetch messages", error: err.message });
  }
};

// EDIT MESSAGE CONTROLLER
export const editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { text } = req.body;
    const currentUserId = req.user.id;

    const message = await messageService.fetchMessageWithConversation(messageId);

    // Validation
    const messageValidationResult = messageValidation.validateMessageExists(message);
    if (!messageValidationResult.isValid) {
      return res.status(messageValidationResult.statusCode).json({ message: messageValidationResult.message });
    }

    const senderValidation = messageValidation.validateIsSenderForEdit(message, currentUserId);
    if (!senderValidation.isValid) {
      return res.status(senderValidation.statusCode).json({ message: senderValidation.message });
    }

    const timeLimitValidation = messageValidation.validateEditTimeLimit(message);
    if (!timeLimitValidation.isValid) {
      return res.status(timeLimitValidation.statusCode).json({ message: timeLimitValidation.message });
    }

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