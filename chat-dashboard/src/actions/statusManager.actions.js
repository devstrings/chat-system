import axiosInstance from "@/lib/axiosInstance";

export const loadMyStatuses = async (currentUserId) => {
  try {
    const response = await axiosInstance.get(`/api/status/user/${currentUserId}`);
    return { success: true, data: response.data };
  } catch (err) {
    console.error("Load my statuses error:", err);
    return { success: false, data: [] };
  }
};

export const handleCreateStatus = async (
  statusType, textContent, selectedFile, caption,
  bgColor, textColor, font, privacy, hiddenFrom, sharedWith,
  onStatusCreated, setLoading, setAlertDialog,
  setTextContent, setCaption, setSelectedFile, setFilePreview, setStatusType
) => {
  if (statusType === "text" && !textContent.trim()) {
    setAlertDialog({ isOpen: true, title: "Required", message: "Please enter some text", type: "error" });
    return;
  }
  if ((statusType === "image" || statusType === "video") && !selectedFile) {
    setAlertDialog({ isOpen: true, title: "Required", message: "Please select a file", type: "error" });
    return;
  }

  setLoading(true);
  try {
    const formData = new FormData();
    formData.append("type", statusType);

    if (statusType === "text") {
      formData.append("content", textContent);
      formData.append("backgroundColor", bgColor);
      formData.append("textColor", textColor);
      formData.append("font", font);
    } else {
      formData.append("file", selectedFile);
    }

    if (caption) formData.append("caption", caption);

    formData.append("privacy", privacy);
    formData.append("hiddenFrom", JSON.stringify(hiddenFrom));
    formData.append("sharedWith", JSON.stringify(sharedWith));

    const response = await axiosInstance.post(`/api/status`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    if (onStatusCreated) onStatusCreated(response.data.status);

    setTextContent("");
    setCaption("");
    setSelectedFile(null);
    setFilePreview(null);
    setStatusType("text");

    setAlertDialog({
      isOpen: true,
      title: "Status Added!",
      message: "Your status has been posted successfully. Add another or close when done.",
      type: "success",
    });

    if (onStatusCreated) onStatusCreated(response.data.status);
  } catch (err) {
    console.error("Create status error:", err);
    setAlertDialog({ isOpen: true, title: "Error", message: "Failed to create status", type: "error" });
  } finally {
    setLoading(false);
  }
};

export const handleDeleteStatus = (
  statusId, currentUserId, setMyStatuses, setConfirmDialog, setAlertDialog
) => {
  setConfirmDialog({
    isOpen: true,
    title: "Delete Status?",
    message: "Are you sure you want to delete this status?",
    type: "danger",
    onConfirm: async () => {
      try {
        await axiosInstance.delete(`/api/status/${statusId}`);
        await loadMyStatuses(currentUserId, setMyStatuses);
        setAlertDialog({ isOpen: true, title: "Deleted!", message: "Status deleted successfully", type: "success" });
      } catch (err) {
        console.error("Delete status error:", err);
        setAlertDialog({ isOpen: true, title: "Error", message: "Failed to delete status", type: "error" });
      }
    },
  });
};

export const handleViewStatusViewers = async (statusId, setStatusViewers, setShowViewers) => {
  try {
    const response = await axiosInstance.get(`/api/status/${statusId}/viewers`);
    setStatusViewers(response.data.viewers);
    setShowViewers(true);
  } catch (err) {
    console.error("Load viewers error:", err);
  }
};