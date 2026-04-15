import axiosInstance from "@/lib/axiosInstance";
import API_BASE_URL from "@/config/api";

export const handleCreate = async (
  groupName,
  description,
  selectedMembers,
  setLoading,
  setAlertDialog,
  onSuccess,
  onClose
) => {
  if (!groupName.trim()) {
    setAlertDialog({
      isOpen: true,
      title: "Error",
      message: "Please enter a group name",
      type: "error",
    });
    return;
  }

  if (selectedMembers.length === 0) {
    setAlertDialog({
      isOpen: true,
      title: "Error",
      message: "Please select at least one member",
      type: "error",
    });
    return;
  }

  try {
    setLoading(true);
    const response = await axiosInstance.post(
      `${API_BASE_URL}/api/groups/create`,
      {
        name: groupName.trim(),
        description: description.trim(),
        memberIds: selectedMembers,
      }
    );

    setAlertDialog({
      isOpen: true,
      title: "Success!",
      message: `Group "${groupName}" created successfully!`,
      type: "success",
    });

    setTimeout(() => {
      onSuccess(response.data);
      onClose();
    }, 1500);
  } catch (err) {
    setAlertDialog({
      isOpen: true,
      title: "Error",
      message: err.response?.data?.message || "Failed to create group",
      type: "error",
    });
  } finally {
    setLoading(false);
  }
};