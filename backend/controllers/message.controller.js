import { messageService } from "#services";
import Message from "#models/Message";
import asyncHandler from "express-async-handler";
// GET OR CREATE CONVERSATION CONTROLLER
export const getOrCreateConversation = asyncHandler(async (req, res) => {
  const currentUserId = req.user.id;
  const { otherUserId, skipCreate } = req.body;
  const existingConversation = await messageService.findExistingConversation(currentUserId, otherUserId);
  const isNewConversation = !existingConversation && !skipCreate;
  const conversation = await messageService.processGetOrCreateConversation(currentUserId, otherUserId, skipCreate);
  if (!conversation && skipCreate) {
    return res.status(404).json({ message: "No conversation found", exists: false });
  }
  if (isNewConversation && conversation) {
    const io = req.app.get("io");
    if (io) {
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
});

// SEND MESSAGE CONTROLLER
export const sendMessage = asyncHandler(async (req, res) => {
  const { conversationId, text, attachments } = req.body;
  const currentUserId = req.user.id;
  const conversation = req.validatedConversation;
  const attachmentIds = attachments?.map((att) => att.attachmentId) || [];
  const message = await Message.create({
    conversationId,
    sender: currentUserId,
    text: text || "",
    attachments: attachmentIds,
    status: "sent",
    isGroupMessage: false,
  });
  await message.populate("sender", "username email profileImage");
  await message.populate({
    path: "attachments",
    select: "fileName fileType sizeInKilobytes serverFileName duration isVoiceMessage",
  });
  conversation.lastMessage = text || "📎 Attachment";
  conversation.lastMessageTime = new Date();
  conversation.lastMessageSender = currentUserId;
  await conversation.save();
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
  const io = req.app.get("io");
  if (io) {
    const otherUserId = conversation.participants.find(
      (p) => p.toString() !== currentUserId,
    );
    io.to(otherUserId.toString()).emit("receiveMessage", messageObj);
  }
  res.json(messageObj);
});

// GET MESSAGES CONTROLLER
export const getMessages = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const currentUserId = req.user.id;
  const limit = parseInt(req.query.limit) || 50;
  const skip = parseInt(req.query.skip) || 0;
  const conversation = req.validatedConversation;
  const wasDeletedByUser = conversation.deletedBy?.some(
    (d) => d.userId?.toString() === currentUserId.toString(),
  );
  if (wasDeletedByUser) {
    return res.status(404).json({ message: "Conversation not found" });
  }
  const otherUserId = conversation.participants
    .find((p) => p.toString() !== currentUserId.toString())
    ?.toString();
  const friendship = await messageService.checkFriendship(currentUserId.toString(), otherUserId);
  if (!friendship) {
    return res.status(403).json({ message: "Not friends" });
  }
  const messages = await messageService.fetchMessages(conversationId, currentUserId, limit, skip);
  const transformedMessages = messageService.transformMessages(messages, currentUserId);
  res.json(transformedMessages);
});

// GET USER CONVERSATIONS CONTROLLER
export const getUserConversations = asyncHandler(async (req, res) => {
  const currentUserId = req.user.id;
  const conversations = await messageService.fetchUserConversations(currentUserId);
  res.json(conversations);
});

// CLEAR CHAT CONTROLLER
export const clearChat = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const currentUserId = req.user.id;
  const result = await messageService.processClearChat(conversationId, currentUserId);
  const io = req.app.get("io");
  if (io) {
    // NAYA
    const userSocket = [...io.sockets.sockets.values()].find(
      (s) => s.user && s.user.id === currentUserId
    );

    if (userSocket) {
      userSocket.emit("chatCleared", {
        conversationId: conversationId.toString(),
        clearedBy: currentUserId,
        clearedFor: currentUserId,
        action: "clearedForMe",
      });
    } else {
    }
    io.to(currentUserId).emit("conversationUpdated", {
      conversationId: conversationId.toString(),
      lastMessage: "",
      lastMessageTime: Date.now(),
    });
  }
  res.json({
    success: result.success,
    action: result.action,
    message: result.message,
    clearedCount: result.clearedCount,
    conversationId: result.conversationId,
  });
});
// DELETE CONVERSATION CONTROLLER
export const deleteConversation = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const currentUserId = req.user.id;
  const { otherUserId } = req.body;
  const result = await messageService.processDeleteConversation(conversationId, currentUserId, otherUserId);
  const io = req.app.get("io");
  if (io) {
    const userSocket = [...io.sockets.sockets.values()].find(
      (s) => s.user && s.user.id === currentUserId,
    );
    if (userSocket) {
      userSocket.emit("conversationDeleted", {
        conversationId: result.conversationId.toString(),
        deletedBy: currentUserId,
        otherUserId: result.userId,
      });
    }
  }
  res.json(result);
});

// DELETE MESSAGE FOR ME CONTROLLER
export const deleteMessageForMe = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const currentUserId = req.user.id;
  const result = await messageService.processDeleteMessageForMe(messageId, currentUserId);
  res.json(result);
});

// DELETE MESSAGE FOR EVERYONE CONTROLLER
export const deleteMessageForEveryone = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const result = await messageService.processDeleteMessageForEveryone(messageId);
  res.json(result);
});

// BULK DELETE MESSAGES CONTROLLER
export const bulkDeleteMessages = asyncHandler(async (req, res) => {
  const { messageIds } = req.body;
  const currentUserId = req.user.id;
  const result = await messageService.processBulkDeleteMessages(messageIds, currentUserId);
  res.json(result);
});

// PIN CONVERSATION CONTROLLER
export const pinConversation = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const userId = req.user.id;
  const result = await messageService.processPinConversation(conversationId, userId);
  res.json(result);
});

// UNPIN CONVERSATION CONTROLLER
export const unpinConversation = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const userId = req.user.id;
  const result = await messageService.processUnpinConversation(conversationId, userId);
  res.json(result);
});

// GET PINNED CONVERSATIONS CONTROLLER
export const getPinnedConversations = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const pinnedConversations = await messageService.fetchPinnedConversations(userId);
  res.json(pinnedConversations);
});

// ARCHIVE CONVERSATION CONTROLLER
export const archiveConversation = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const userId = req.user.id;
  const result = await messageService.processArchiveConversation(conversationId, userId);
  res.json(result);
});
// UNARCHIVE CONVERSATION CONTROLLER
export const unarchiveConversation = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const userId = req.user.id;
  const result = await messageService.processUnarchiveConversation(conversationId, userId);
  res.json(result);
});

// GET ARCHIVED CONVERSATIONS CONTROLLER
export const getArchivedConversations = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const archivedConversations = await messageService.fetchArchivedConversations(userId);
  res.json(archivedConversations);
});

// GET GROUP MESSAGES CONTROLLER
export const getGroupMessages = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const limit = parseInt(req.query.limit) || 50;
  const skip = parseInt(req.query.skip) || 0;
  const messages = await messageService.fetchGroupMessages(groupId, limit, skip);
  const transformedMessages = messageService.transformGroupMessages(messages);
  res.json(transformedMessages);
});

// EDIT MESSAGE CONTROLLER
export const editMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const { text } = req.body;
  const result = await messageService.processEditMessage(messageId, text);
  res.json(result);
});