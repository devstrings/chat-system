

export const toggleMessageSelection = (setSelectedMessages, messageId) => {
  setSelectedMessages((prev) => {
    const newSet = new Set(prev);
    if (newSet.has(messageId)) {
      newSet.delete(messageId);
    } else {
      newSet.add(messageId);
    }
    return newSet;
  });
};

export const selectAllMessages = (setSelectedMessages, messages) => {
  setSelectedMessages(new Set(messages.map((msg) => msg._id)));
};

export const deselectAllMessages = (setSelectedMessages) => {
  setSelectedMessages(new Set());
};

export const handleBulkDelete = (socket, selectedMessages, groupId, setIsSelectionMode, setSelectedMessages) => {
  if (selectedMessages.size === 0) return;
  const messageIds = Array.from(selectedMessages);
  messageIds.forEach((messageId) => {
    socket?.emit("deleteGroupMessageForMe", {
      messageId,
      groupId,
    });
  });
  setIsSelectionMode(false);
  setSelectedMessages(new Set());
};