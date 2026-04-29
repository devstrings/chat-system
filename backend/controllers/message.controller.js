import { messageService } from "#services";
import Message from "#models/Message";
import Group from "#models/Group";
import Conversation from "#models/Conversation";
import asyncHandler from "express-async-handler";

export const getOrCreateConversation = asyncHandler(async (req, res) => {
  const currentUserId = req.user.id;
  const { otherUserId, skipCreate } = req.body;
  const existingConversation = await messageService.findExistingConversation(
    currentUserId,
    otherUserId,
  );
  const isNewConversation = !existingConversation && !skipCreate;
  const conversation = await messageService.processGetOrCreateConversation(
    currentUserId,
    otherUserId,
    skipCreate,
  );
  if (!conversation && skipCreate) {
    return res
      .status(404)
      .json({ message: "No conversation found", exists: false });
  }
  if (isNewConversation && conversation) {
    const io = req.app.get("webSocket");
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

export const sendMessage = asyncHandler(async (req, res) => {
  let { conversationId, groupId, text, attachments, encryptionData, replyTo } =
    req.body;
  const currentUserId = req.user.id;

  if (!groupId && conversationId && !req.validatedConversation) {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }
    if (!conversation.participants.includes(currentUserId)) {
      return res
        .status(403)
        .json({ message: "Not a participant in this conversation" });
    }
    req.validatedConversation = conversation;
  }

  const attachmentIds = attachments?.map((att) => att.attachmentId) || [];
  const io = req.app.get("webSocket");

  if (groupId) {
    const group = await Group.findById(groupId).populate("members", "_id");
    if (!group) return res.status(404).json({ message: "Group not found" });

    const message = await Message.create({
      groupId,
      sender: currentUserId,
      text: text || "",
      encryptionData: encryptionData || undefined,
      attachments: attachmentIds,
      isGroupMessage: true,
      status: "sent",
      replyTo: replyTo || null,
      isForwarded: req.body.isForwarded || false,
    });
    await message.populate("sender", "username email profileImage");
    await message.populate({
      path: "attachments",
      select:
        "fileName fileType originalFileType sizeInKilobytes serverFileName duration isVoiceMessage isEncrypted encryptionData",
    });

    group.lastMessage = text || " Attachment";
    group.lastMessageTime = new Date();
    group.lastMessageSender = currentUserId;
    await group.save();

    const messageObj = message.toObject();

    if (messageObj.encryptionData?.keys instanceof Map) {
      messageObj.encryptionData.keys = Object.fromEntries(
        messageObj.encryptionData.keys,
      );
    }

    if (messageObj.attachments?.length > 0) {
      messageObj.attachments = messageObj.attachments.map((att) => ({
        url: `/api/file/get/${att.serverFileName}`,
        filename: att.fileName,
        fileType: att.originalFileType || att.fileType,
        fileSize: att.sizeInKilobytes * 1024,
        attachmentId: att._id,
        duration: att.duration || 0,
        isVoiceMessage: att.isVoiceMessage || false,
        isEncrypted: att.isEncrypted || false,
        encryptionData: att.encryptionData || { iv: "", algorithm: "" },
      }));
    }

    if (io) {
      group.members.forEach((member) => {
        messageObj.receiver = member._id;
        io.to(member._id.toString()).emit("receiveGroupMessage", messageObj);
      });
    }

    return res.json(messageObj);
  }

  // --- INDIVIDUAL MESSAGE ---
  const conversation = req.validatedConversation;
  const otherUserId = conversation.participants
    .find((p) => p.toString() !== currentUserId.toString())
    ?.toString();
  const friendship = await messageService.checkFriendship(
    currentUserId.toString(),
    otherUserId,
  );
  if (!friendship) {
    return res.status(403).json({ message: "Not friends" });
  }

  const message = await Message.create({
    conversationId,
    sender: currentUserId,
    text: text || "",
    encryptionData: encryptionData || undefined,
    attachments: attachmentIds,
    status: "sent",
    isGroupMessage: false,
    replyTo: replyTo || null,
    isForwarded: req.body.isForwarded || false,
  });
  await message.populate("sender", "username email profileImage");
  await message.populate({
    path: "attachments",
    select:
      "fileName fileType originalFileType sizeInKilobytes serverFileName duration isVoiceMessage isEncrypted encryptionData",
  });
  conversation.lastMessage = text || "📎 Attachment";
  conversation.lastMessageTime = new Date();
  conversation.lastMessageSender = currentUserId;
  await conversation.save();
  const messageObj = message.toObject();
  if (messageObj.attachments?.length > 0) {
    messageObj.attachments = messageObj.attachments.map((att) => ({
      url: `/api/file/get/${att.serverFileName}`,
      filename: att.fileName,
      fileType: att.originalFileType || att.fileType,
      fileSize: att.sizeInKilobytes * 1024,
      attachmentId: att._id,
      duration: att.duration || 0,
      isVoiceMessage: att.isVoiceMessage || false,
      isEncrypted: att.isEncrypted || false,
      encryptionData: att.encryptionData || { iv: "", algorithm: "" },
    }));
  }
  if (io) {
    // Add receiver field to messageObj
    messageObj.receiver = otherUserId;
    io.to(currentUserId)
      .to(otherUserId.toString())
      .emit("receiveMessage", messageObj);
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
  const friendship = await messageService.checkFriendship(
    currentUserId.toString(),
    otherUserId,
  );
  if (!friendship) {
    return res.status(403).json({ message: "Not friends" });
  }
  const messages = await messageService.fetchMessages(
    conversationId,
    currentUserId,
    limit,
    skip,
  );
  const transformedMessages = messageService.transformMessages(
    messages,
    currentUserId,
  );
  res.json(transformedMessages);
});

// GET USER CONVERSATIONS CONTROLLER
export const getUserConversations = asyncHandler(async (req, res) => {
  const currentUserId = req.user.id;
  const conversations =
    await messageService.fetchUserConversations(currentUserId);
  res.json(conversations);
});

// CLEAR CHAT CONTROLLER
export const clearChat = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const currentUserId = req.user.id;
  const result = await messageService.processClearChat(
    conversationId,
    currentUserId,
  );
  const io = req.app.get("webSocket");
  if (io) {
    // NAYA
    const userSocket = [...io.sockets.sockets.values()].find(
      (s) => s.user && s.user.id === currentUserId,
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
  const result = await messageService.processDeleteConversation(
    conversationId,
    currentUserId,
    otherUserId,
  );
  const io = req.app.get("webSocket");
  if (io) {
    const conversation = await Conversation.findById(conversationId);

    if (result.bothDeleted) {
      const participants =
        (await Conversation.findById(conversationId)) || conversation; // fallback

      if (participants?.participants) {
        for (const participantId of participants.participants) {
          const participantSocket = [...io.sockets.sockets.values()].find(
            (s) => s.user && s.user.id === participantId.toString(),
          );
          if (participantSocket) {
            participantSocket.emit("conversationDeleted", {
              conversationId: result.conversationId.toString(),
              deletedBy: currentUserId,
              otherUserId: result.userId,
            });

            participantSocket.emit("chatCleared", {
              conversationId: result.conversationId.toString(),
              clearedFor: participantId.toString(),
              clearedBy: currentUserId,
              action: "conversationDeleted",
            });
          }
        }
      }
    } else {
      const userSocket = [...io.sockets.sockets.values()].find(
        (s) => s.user && s.user.id === currentUserId,
      );
      if (userSocket) {
        userSocket.emit("conversationDeleted", {
          conversationId: result.conversationId.toString(),
          deletedBy: currentUserId,
          otherUserId: result.userId,
        });

        userSocket.emit("chatCleared", {
          conversationId: result.conversationId.toString(),
          clearedFor: currentUserId,
          clearedBy: currentUserId,
          action: "conversationDeleted",
        });
      }
    }
  }
  res.json(result);
});

// DELETE MESSAGE FOR ME CONTROLLER
export const deleteMessageForMe = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const currentUserId = req.user.id;
  const result = await messageService.processDeleteMessageForMe(
    messageId,
    currentUserId,
  );
  res.json(result);
});

// DELETE MESSAGE FOR EVERYONE CONTROLLER
export const deleteMessageForEveryone = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const result =
    await messageService.processDeleteMessageForEveryone(messageId);
  res.json(result);
});

// BULK DELETE MESSAGES CONTROLLER
export const bulkDeleteMessages = asyncHandler(async (req, res) => {
  const { messageIds } = req.body;
  const currentUserId = req.user.id;
  const result = await messageService.processBulkDeleteMessages(
    messageIds,
    currentUserId,
  );
  res.json(result);
});

// PIN CONVERSATION CONTROLLER
export const pinConversation = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const userId = req.user.id;
  const result = await messageService.processPinConversation(
    conversationId,
    userId,
  );
  res.json(result);
});

// UNPIN CONVERSATION CONTROLLER
export const unpinConversation = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const userId = req.user.id;
  const result = await messageService.processUnpinConversation(
    conversationId,
    userId,
  );
  res.json(result);
});

// GET PINNED CONVERSATIONS CONTROLLER
export const getPinnedConversations = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const pinnedConversations =
    await messageService.fetchPinnedConversations(userId);
  res.json(pinnedConversations);
});

// ARCHIVE CONVERSATION CONTROLLER
export const archiveConversation = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const userId = req.user.id;
  const result = await messageService.processArchiveConversation(
    conversationId,
    userId,
  );
  res.json(result);
});
// UNARCHIVE CONVERSATION CONTROLLER
export const unarchiveConversation = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const userId = req.user.id;
  const result = await messageService.processUnarchiveConversation(
    conversationId,
    userId,
  );
  res.json(result);
});

// GET ARCHIVED CONVERSATIONS CONTROLLER
export const getArchivedConversations = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const archivedConversations =
    await messageService.fetchArchivedConversations(userId);
  res.json(archivedConversations);
});

// GET GROUP MESSAGES CONTROLLER
export const getGroupMessages = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const limit = parseInt(req.query.limit) || 50;
  const skip = parseInt(req.query.skip) || 0;
  const messages = await messageService.fetchGroupMessages(
    groupId,
    limit,
    skip,
  );
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

// CHECK CONVERSATION EXISTS CONTROLLER
export const checkConversationExists = asyncHandler(async (req, res) => {
  try {
    const { conversationId } = req.params;
    const conversation = await Conversation.findById(conversationId);
    res.json({ exists: !!conversation });
  } catch (err) {
    res.json({ exists: false });
  }
});
