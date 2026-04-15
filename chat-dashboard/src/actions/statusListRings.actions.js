import axiosInstance from "@/lib/axiosInstance";

export const loadStatuses = async (currentUserId) => {
  try {
    const response = await axiosInstance.get(`/api/status`);
    const data = response.data;

    const now = new Date();
    const filtered = data
      .map((userStatus) => ({
        ...userStatus,
        statuses: userStatus.statuses.filter(
          (s) => new Date(s.expiresAt) > now,
        ),
      }))
      .filter((u) => u.statuses.length > 0);

    const uniqueUsers = Object.values(
      filtered.reduce((acc, item) => {
        const userId = item.user._id;
        if (!acc[userId]) {
          acc[userId] = { user: item.user, statuses: [] };
        }
        acc[userId].statuses.push(...item.statuses);
        return acc;
      }, {}),
    );

    return { success: true, data: uniqueUsers };
  } catch (err) {
    console.error("Load statuses error:", err);
    return { success: false, data: [] };
  }
};