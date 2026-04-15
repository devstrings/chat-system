import axiosInstance from "@/lib/axiosInstance";

export const markStatusAsViewed = async (statusId) => {
  try {
    await axiosInstance.post(`/api/status/${statusId}/view`);
  } catch (err) {
    console.error("Mark as viewed error:", err);
  }
};

export const formatTime = (date) => {
  if (!date) return "";
  const now = new Date();
  const statusDate = new Date(date);
  const diff = now - statusDate;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;

  return statusDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};