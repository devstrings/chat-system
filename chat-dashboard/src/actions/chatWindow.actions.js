import { bulkDeleteMessages } from "@/store/slices/chatSlice";

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
  const allMessageIds = messages.map((msg) => msg._id);
  setSelectedMessages(new Set(allMessageIds));
};

export const deselectAllMessages = (setSelectedMessages) => {
  setSelectedMessages(new Set());
};

export const toggleSelectionMode = (isSelectionMode, setIsSelectionMode, setSelectedMessages) => {
  setIsSelectionMode(!isSelectionMode);
  setSelectedMessages(new Set());
};

export const confirmBulkDelete = async (
  selectedMessages,
  conversationId,
  dispatch,
  setIsSelectionMode,
  setSelectedMessages,
  setDeleteDialog
) => {
  try {
    const messageIds = Array.from(selectedMessages);
    await dispatch(
      bulkDeleteMessages({
        messageIds,
        conversationId,
        deleteForEveryone: false,
      }),
    ).unwrap();

    setIsSelectionMode(false);
    setSelectedMessages(new Set());
    setDeleteDialog({ isOpen: false, count: 0 });
  } catch (err) {
    console.error("Bulk delete error:", err);
    alert("Failed to delete messages");
  }
};