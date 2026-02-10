
export const validateOtherUserId = (otherUserId) => {
  if (!otherUserId) {
    return {
      isValid: false,
      message: "Other user ID required"
    };
  }
  return { isValid: true };
};

export const validateConversationExists = (conversation) => {
  if (!conversation) {
    return {
      isValid: false,
      statusCode: 404,
      message: "Conversation not found"
    };
  }
  return { isValid: true };
};

export const validateIsParticipant = (conversation, userId) => {
  if (!conversation.participants.includes(userId)) {
    return {
      isValid: false,
      statusCode: 403,
      message: "Unauthorized"
    };
  }
  return { isValid: true };
};

export const validateFriendship = (friendship) => {
  if (!friendship) {
    return {
      isValid: false,
      statusCode: 403,
      message: "You must be friends to chat"
    };
  }
  return { isValid: true };
};

export const validateFriendshipForMessages = (friendship) => {
  if (!friendship) {
    return {
      isValid: false,
      statusCode: 403,
      message: "You must be friends to view messages"
    };
  }
  return { isValid: true };
};

export const validateMessageExists = (message) => {
  if (!message) {
    return {
      isValid: false,
      statusCode: 404,
      message: "Message not found"
    };
  }
  return { isValid: true };
};

export const validateMessageConversationExists = (message) => {
  if (!message.conversationId) {
    return {
      isValid: false,
      statusCode: 404,
      message: "Conversation not found"
    };
  }
  return { isValid: true };
};

export const validateIsMessageParticipant = (message, userId) => {
  const isParticipant = message.conversationId.participants.some(
    (p) => p.toString() === userId
  );

  if (!isParticipant) {
    return {
      isValid: false,
      statusCode: 403,
      message: "Unauthorized"
    };
  }
  return { isValid: true };
};

export const validateIsSender = (message, userId) => {
  if (message.sender.toString() !== userId) {
    return {
      isValid: false,
      statusCode: 403,
      message: "Only sender can delete for everyone"
    };
  }
  return { isValid: true };
};

export const validateIsSenderForEdit = (message, userId) => {
  if (message.sender.toString() !== userId) {
    return {
      isValid: false,
      statusCode: 403,
      message: "Only sender can edit message"
    };
  }
  return { isValid: true };
};

export const validateDeleteTimeLimit = (message) => {
  const messageAge = Date.now() - new Date(message.createdAt).getTime();
  const fiveMinutes = 5 * 60 * 1000;

  if (messageAge > fiveMinutes) {
    return {
      isValid: false,
      statusCode: 400,
      message: "Cannot delete for everyone after 5 minutes"
    };
  }
  return { isValid: true };
};

export const validateEditTimeLimit = (message) => {
  const messageAge = Date.now() - new Date(message.createdAt).getTime();
  const threeHours = 3 * 60 * 60 * 1000;

  if (messageAge > threeHours) {
    return {
      isValid: false,
      statusCode: 400,
      message: "Cannot edit message after 3 hours"
    };
  }
  return { isValid: true };
};

export const validateBulkDeleteMessages = (messageIds) => {
  if (!messageIds || messageIds.length === 0) {
    return {
      isValid: false,
      statusCode: 400,
      message: "No messages to delete"
    };
  }
  return { isValid: true };
};

export const validateGroupExists = (group) => {
  if (!group) {
    return {
      isValid: false,
      statusCode: 404,
      message: "Group not found"
    };
  }
  return { isValid: true };
};

export const validateIsGroupMember = (group, userId) => {
  if (!group.members.includes(userId)) {
    return {
      isValid: false,
      statusCode: 403,
      message: "Not a member of this group"
    };
  }
  return { isValid: true };
};

export const validateIsConversationParticipant = (conversation, userId) => {
  const isParticipant = conversation.participants.some(
    (p) => p.toString() === userId
  );

  if (!isParticipant) {
    return {
      isValid: false,
      statusCode: 403,
      message: "Not authorized"
    };
  }
  return { isValid: true };
};

export const validateNotAlreadyPinnedConversation = (conversation, userId) => {
  const alreadyPinned = conversation.pinnedBy.some(
    (pin) => pin.userId.toString() === userId
  );

  if (alreadyPinned) {
    return {
      isValid: false,
      statusCode: 400,
      message: "Already pinned"
    };
  }
  return { isValid: true };
};

export const validatePinLimitConversation = (userPinnedCount) => {
  if (userPinnedCount >= 3) {
    return {
      isValid: false,
      statusCode: 400,
      message: "Maximum 3 chats can be pinned. Unpin a chat first."
    };
  }
  return { isValid: true };
};

export const validateNotAlreadyArchived = (conversation, userId) => {
  const alreadyArchived = conversation.archivedBy.some(
    (archive) => archive.userId.toString() === userId
  );

  if (alreadyArchived) {
    return {
      isValid: false,
      statusCode: 400,
      message: "Already archived"
    };
  }
  return { isValid: true };
};