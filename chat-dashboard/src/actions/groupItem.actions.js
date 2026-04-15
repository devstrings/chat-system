import axiosInstance from "@/lib/axiosInstance";
import API_BASE_URL from "@/config/api";

export const formatTime = (date) => {
  if (!date) return "";
  const now = new Date();
  const msgDate = new Date(date);
  const diff = now - msgDate;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d`;
  return msgDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

export const truncateMessage = (msg, length = 30) => {
  if (!msg || msg.trim() === "") return "";
  if (msg.length <= length) return msg;
  return msg.substring(0, length) + "...";
};

export const clearGroupChat = async (group, setConfirmDialog, setAlertDialog) => {
  setConfirmDialog({
    isOpen: true,
    title: "Clear Group Chat?",
    message: `Clear all messages in ${group.name}? This action cannot be undone.`,
    confirmText: "Clear Chat",
    cancelText: "Cancel",
    highlightText: group.name,
    icon: "delete",
    type: "danger",
    onConfirm: async () => {
      try {
        await axiosInstance.delete(`${API_BASE_URL}/api/groups/${group._id}/clear`);
        setAlertDialog({
          isOpen: true,
          title: "Chat Cleared!",
          message: "All group messages have been deleted successfully.",
          type: "success",
        });
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } catch (err) {
        setAlertDialog({
          isOpen: true,
          title: "Error",
          message: "Could not clear chat. Please try again.",
          type: "error",
        });
      }
    },
  });
};

export const leaveGroup = async (group, setConfirmDialog, setAlertDialog) => {
  setConfirmDialog({
    isOpen: true,
    title: "Leave Group?",
    message: `Are you sure you want to leave ${group.name}? You won't be able to see group messages.`,
    confirmText: "Leave Group",
    cancelText: "Cancel",
    highlightText: group.name,
    icon: "warning",
    type: "danger",
    onConfirm: async () => {
      try {
        await axiosInstance.post(
          `${API_BASE_URL}/api/groups/${group._id}/leave`,
          {},
        );
        setAlertDialog({
          isOpen: true,
          title: "Left Group",
          message: `You have left ${group.name}`,
          type: "info",
        });
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } catch (err) {
        setAlertDialog({
          isOpen: true,
          title: "Error",
          message: err.response?.data?.message || "Failed to leave group",
          type: "error",
        });
      }
    },
  });
};