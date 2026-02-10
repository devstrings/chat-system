
import Message from "../models/message.js";
import Conversation from "../models/Conversation.js";
import Attachment from "../models/Attachment.js";
import Friendship from "../models/Friendship.js";
import Group from "../models/Group.js";

// CHECK FRIENDSHIP SERVICE
export const checkFriendship = async (currentUserId, otherUserId) => {
  const friendship = await Friendship.findOne({
    $or: [
      { user1: currentUserId, user2: otherUserId },
      { user1: otherUserId, user2: currentUserId },
    ],
  });

  return friendship;
};

// FIND EXISTING CONVERSATION SERVICE
export const findExistingConversation = async (currentUserId, otherUserId) => {
  const conversation = await Conversation.findOne({
    participants: { $all: [currentUserId, otherUserId] },
  });

  return conversation;
};

// CREATE NEW CONVERSATION SERVICE
export const createNewConversation = async (currentUserId, otherUserId) => {
  const conversation = await Conversation.create({
    participants: [currentUserId, otherUserId],
  });

  console.log(" Created NEW conversation:", conversation._id);
  return conversation;
};

// GET OR CREATE CONVERSATION SERVICE
export const processGetOrCreateConversation = async (currentUserId, otherUserId, skipCreate) => {
  // Find existing conversation
  let conversation = await findExistingConversation(currentUserId, otherUserId);

  //  If skipCreate flag is set, don't create new conversation
  if (!conversation && skipCreate) {
    console.log(" No conversation found, skipCreate=true, returning null");
    return null;
  }

  // Create new if doesn't exist (only when NOT skipping)
  if (!conversation) {
    conversation = await createNewConversation(currentUserId, otherUserId);
  }

  return conversation;
};

// FETCH CONVERSATION BY ID SERVICE
export const fetchConversationById = async (conversationId) => {
  const conversation = await Conversation.findById(conversationId);
  return conversation;
};

// FIND OTHER USER IN CONVERSATION SERVICE
export const findOtherUserInConversation = (conversation, currentUserId) => {
  const otherUserId = conversation.participants.find(
    (p) => p.toString() !== currentUserId
  );
  return otherUserId;
};

// FETCH MESSAGES SERVICE
export const fetchMessages = async (conversationId, currentUserId, limit, skip) => {
  const messages = await Message.find({
    conversationId,
    // Filter out messages deleted for current user
    $or: [{ isDeleted: false }, { deletedFor: { $ne: currentUserId } }],
  })
    .populate("sender", "username email")
    .populate({
      path: "attachments",
      select:
        "fileName fileType sizeInKilobytes serverFileName status duration isVoiceMessage",
    })
    .sort({ createdAt: 1 })
    .skip(skip)
    .limit(limit);

  return messages;
};

// TRANSFORM MESSAGES SERVICE
export const transformMessages = (messages, currentUserId) => {
  const transformedMessages = messages.map((msg) => {
    const messageObj = msg.toObject();

    // Add deleted info for frontend
    messageObj.isDeletedForMe = msg.deletedFor.includes(currentUserId);
    messageObj.isDeletedForEveryone = msg.deletedForEveryone;

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

    return messageObj;
  });

  return transformedMessages;
};

// FETCH USER CONVERSATIONS SERVICE
export const fetchUserConversations = async (currentUserId) => {
  const conversations = await Conversation.find({
    participants: currentUserId,
    "archivedBy.userId": { $ne: currentUserId },
    "deletedBy.userId": { $ne: currentUserId },
  })
    .populate("participants", "username email profileImage")
    .populate("lastMessageSender", "username")
    .sort({ lastMessageTime: -1 });

  return conversations;
};

// CLEAR CHAT SERVICE
export const processClearChat = async (conversationId, currentUserId) => {
  console.log(" CLEAR CHAT START");
  console.log(" conversationId:", conversationId);
  console.log(" userId:", currentUserId);

  const conversation = await Conversation.findById(conversationId);

  //  Mark messages as deleted for current user
  const result = await Message.updateMany(
    {
      conversationId,
      deletedFor: { $ne: currentUserId },
    },
    {
      $addToSet: { deletedFor: currentUserId },
    }
  );

  console.log(` Marked ${result.modifiedCount} messages as deleted for user`);

  //  Update conversation lastMessage
  conversation.lastMessage = "";
  conversation.lastMessageTime = new Date();
  await conversation.save();

  console.log(" Conversation updated");

  return {
    success: true,
    action: "CLEAR",
    message: "Messages cleared for you only",
    clearedCount: result.modifiedCount,
    conversationId: conversationId,
    participants: conversation.participants,
  };
};

// DELETE CONVERSATION SERVICE
export const processDeleteConversation = async (conversationId, currentUserId, otherUserId) => {
  console.log("[DELETE] Starting deletion for:", conversationId);

  let conversation;

  if (conversationId && conversationId !== "undefined" && conversationId !== "null") {
    conversation = await Conversation.findById(conversationId);
  }

  if (!conversation && otherUserId) {
    conversation = await Conversation.findOne({
      participants: { $all: [currentUserId, otherUserId] },
    });
  }

  if (!conversation) {
    console.log("No conversation found");
    throw new Error("No conversation found to delete");
  }

  const otherUserIdInConv = conversation.participants.find(
    (p) => p.toString() !== currentUserId
  );

  console.log(" Participants:", {
    currentUser: currentUserId,
    otherUser: otherUserIdInConv
  });

  // Add current user to deletedBy array 
  if (!conversation.deletedBy) {
    conversation.deletedBy = [];
  }
  
  const alreadyDeleted = conversation.deletedBy.some(
    (d) => d.userId.toString() === currentUserId
  );

  if (!alreadyDeleted) {
    conversation.deletedBy.push({
      userId: currentUserId,
      deletedAt: new Date(),
    });
    await conversation.save();
    console.log(" Added user to deletedBy array");
  }

  //  Delete messages ONLY for current user 
  const result = await Message.updateMany(
    {
      conversationId: conversation._id,
      deletedFor: { $ne: currentUserId },
    },
    {
      $addToSet: { deletedFor: currentUserId },
    }
  );
  console.log(` Marked ${result.modifiedCount} messages as deleted for user`);

  //  Check if BOTH users deleted it
  const bothDeleted = conversation.participants.every((p) =>
    conversation.deletedBy.some((d) => d.userId.toString() === p.toString())
  );

  if (bothDeleted) {
    console.log(" BOTH users deleted, hard deleting conversation & messages");
    
    // Hard delete messages
    await Message.deleteMany({ conversationId: conversation._id });
    
    // Hard delete attachments
    await Attachment.updateMany(
      { conversationId: conversation._id },
      { status: "deleted" }
    );
    
    // Hard delete conversation
    await Conversation.findByIdAndDelete(conversation._id);
    
    console.log(" Conversation permanently deleted from DB");
  } else {
    console.log("Soft deleted for current user only");
  }

  return {
    success: true,
    action: bothDeleted ? "HARD_DELETE" : "SOFT_DELETE",
    message: bothDeleted 
      ? "Conversation permanently deleted" 
      : "Conversation deleted for you only",
    conversationId: conversation._id,
    userId: otherUserIdInConv?.toString(),
    bothDeleted,
    currentUserId,
  };
};

// DELETE MESSAGE FOR ME SERVICE
export const processDeleteMessageForMe = async (messageId, currentUserId) => {
  console.log(" Delete for me - Message:", messageId, "User:", currentUserId);

  // Populate conversation to get participants
  const message = await Message.findById(messageId).populate("conversationId");

  // Add user to deletedFor array
  if (!message.deletedFor.includes(currentUserId)) {
    message.deletedFor.push(currentUserId);
  }

  // If ALL participants deleted, mark as fully deleted
  const allDeleted = message.conversationId.participants.every((p) =>
    message.deletedFor.includes(p.toString()),
  );

  if (allDeleted) {
    message.isDeleted = true;
    message.deletedAt = new Date();
  }

  await message.save();

  console.log(" Message deleted for user");

  return {
    message: "Message deleted for you",
    deletedFor: message.deletedFor,
    isDeleted: message.isDeleted,
  };
};

// DELETE MESSAGE FOR EVERYONE SERVICE
export const processDeleteMessageForEveryone = async (messageId) => {
  const message = await Message.findById(messageId);

  // Mark as deleted for everyone
  message.deletedForEveryone = true;
  message.isDeleted = true;
  message.deletedAt = new Date();
  message.text = ""; // Clear text
  message.attachments = []; // Clear attachments

  await message.save();

  console.log(" Message deleted for everyone");

  return {
    message: "Message deleted for everyone",
    deletedForEveryone: true,
  };
};

// BULK DELETE MESSAGES SERVICE
export const processBulkDeleteMessages = async (messageIds, currentUserId) => {
  console.log(" Bulk delete - Messages:", messageIds.length, "User:", currentUserId);

  // Populate conversation for each message
  const messages = await Message.find({ _id: { $in: messageIds } }).populate(
    "conversationId",
  );

  let deletedCount = 0;

  for (const message of messages) {
    if (!message.conversationId) {
      continue; // Skip if conversation not found
    }

    // Verify user is participant
    const isParticipant = message.conversationId.participants.some(
      (p) => p.toString() === currentUserId,
    );

    if (isParticipant) {
      if (!message.deletedFor.includes(currentUserId)) {
        message.deletedFor.push(currentUserId);
      }

      // If all participants deleted, mark as fully deleted
      const allDeleted = message.conversationId.participants.every((p) =>
        message.deletedFor.includes(p.toString()),
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

  return {
    message: `${deletedCount} messages deleted`,
    deletedCount,
  };
};

// FETCH MESSAGE BY ID SERVICE
export const fetchMessageById = async (messageId) => {
  const message = await Message.findById(messageId);
  return message;
};

// FETCH MESSAGE WITH CONVERSATION SERVICE
export const fetchMessageWithConversation = async (messageId) => {
  const message = await Message.findById(messageId).populate("conversationId");
  return message;
};

// PIN CONVERSATION SERVICE
export const processPinConversation = async (conversationId, userId) => {
  const conversation = await Conversation.findById(conversationId);

  // Add pin
  conversation.pinnedBy.push({
    userId: userId,
    pinnedAt: new Date(),
  });

  await conversation.save();

  console.log(` Conversation pinned: ${conversationId} by ${userId}`);

  return {
    message: "Conversation pinned successfully",
    conversation,
  };
};

// UNPIN CONVERSATION SERVICE
export const processUnpinConversation = async (conversationId, userId) => {
  const conversation = await Conversation.findById(conversationId);

  // Remove pin
  conversation.pinnedBy = conversation.pinnedBy.filter(
    (pin) => pin.userId.toString() !== userId,
  );

  await conversation.save();

  console.log(` Conversation unpinned: ${conversationId} by ${userId}`);

  return {
    message: "Conversation unpinned successfully",
    conversation,
  };
};

// GET PINNED CONVERSATIONS SERVICE
export const fetchPinnedConversations = async (userId) => {
  const pinnedConversations = await Conversation.find({
    "pinnedBy.userId": userId,
  })
    .populate("participants", "username email profileImage")
    .sort({ "pinnedBy.pinnedAt": -1 });

  return pinnedConversations;
};

// ARCHIVE CONVERSATION SERVICE
export const processArchiveConversation = async (conversationId, userId) => {
  const conversation = await Conversation.findById(conversationId);

  // Add to archive
  conversation.archivedBy.push({
    userId: userId,
    archivedAt: new Date(),
  });

  await conversation.save();

  console.log(` Conversation archived: ${conversationId} by ${userId}`);

  return {
    message: "Conversation archived successfully",
    conversation,
  };
};

// UNARCHIVE CONVERSATION SERVICE
export const processUnarchiveConversation = async (conversationId, userId) => {
  const conversation = await Conversation.findById(conversationId);

  // Remove from archive
  conversation.archivedBy = conversation.archivedBy.filter(
    (archive) => archive.userId.toString() !== userId,
  );

  await conversation.save();

  console.log(` Conversation unarchived: ${conversationId} by ${userId}`);

  return {
    message: "Conversation unarchived successfully",
    conversation,
  };
};

// GET ARCHIVED CONVERSATIONS SERVICE
export const fetchArchivedConversations = async (userId) => {
  const archivedConversations = await Conversation.find({
    "archivedBy.userId": userId,
  })
    .populate("participants", "username email profileImage")
    .populate("lastMessageSender", "username")
    .sort({ "archivedBy.archivedAt": -1 });

  return archivedConversations;
};

// FETCH GROUP BY ID SERVICE
export const fetchGroupById = async (groupId) => {
  const group = await Group.findById(groupId);
  return group;
};

// FETCH GROUP MESSAGES SERVICE
export const fetchGroupMessages = async (groupId, limit, skip) => {
  const messages = await Message.find({
    groupId,
    isGroupMessage: true,
    isDeleted: false,
  })
    .populate("sender", "username email profileImage")
    .populate({
      path: "attachments",
      select:
        "fileName fileType sizeInKilobytes serverFileName duration isVoiceMessage",
    })
    .sort({ createdAt: 1 })
    .skip(skip)
    .limit(limit);

  return messages;
};

// TRANSFORM GROUP MESSAGES SERVICE
export const transformGroupMessages = (messages) => {
  const transformedMessages = messages.map((msg) => {
    const messageObj = msg.toObject();

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

    return messageObj;
  });

  return transformedMessages;
};

// EDIT MESSAGE SERVICE
export const processEditMessage = async (messageId, text) => {
  const message = await Message.findById(messageId).populate('conversationId');

  // Save to edit history
  if (!message.editHistory) {
    message.editHistory = [];
  }
  message.editHistory.push({
    text: message.text,
    editedAt: new Date()
  });

  // Update message
  message.text = text;
  message.isEdited = true;
  message.editedAt = new Date();

  await message.save();

  return {
    message: "Message edited successfully",
    updatedMessage: message
  };
};

// CHECK USER PIN COUNT SERVICE
export const checkUserConversationPinCount = async (userId) => {
  const userPinnedCount = await Conversation.countDocuments({
    "pinnedBy.userId": userId,
  });

  return userPinnedCount;
};