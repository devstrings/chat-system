import axiosInstance from "@/lib/axiosInstance";
import API_BASE_URL from "@/config/api";

export const handleDeleteForMe = async (
  message, socket, setShowDeleteModal, setShowOptions
) => {
  try {
    if (message.isGroupMessage && message.groupId) {
      socket?.emit("deleteGroupMessageForMe", {
        messageId: message._id,
        groupId: message.groupId,
      });
    } else {
      await axiosInstance.delete(
        `${API_BASE_URL}/api/messages/message/${message._id}/for-me`
      );
      if (socket) {
        socket.emit("deleteMessageForMe", {
          messageId: message._id,
          conversationId: message.conversationId,
        });
      }
    }
    setShowDeleteModal(false);
    setShowOptions(false);
  } catch (err) {
    console.error("Delete for me error:", err);
    alert("Failed to delete message");
  }
};

export const handleDeleteForEveryone = async (
  message, socket, setShowDeleteModal, setShowOptions
) => {
  try {
    if (message.isGroupMessage && message.groupId) {
      socket?.emit("deleteGroupMessageForEveryone", {
        messageId: message._id,
        groupId: message.groupId,
      });
    } else {
      await axiosInstance.delete(
        `${API_BASE_URL}/api/messages/message/${message._id}/for-everyone`
      );
      if (socket) {
        socket.emit("deleteMessageForEveryone", {
          messageId: message._id,
          conversationId: message.conversationId,
        });
      }
    }
    setShowDeleteModal(false);
    setShowOptions(false);
  } catch (err) {
    console.error("Delete for everyone error:", err);
    if (err.response?.status === 400) {
      alert("Cannot delete for everyone after 5 minutes");
    } else {
      alert("Failed to delete message");
    }
  }
};

export const handleFileDownload = async (file, getFileName) => {
  try {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      alert("Please login to download files");
      return;
    }

    let downloadUrl;
    let needsAuth = true;

    if (file.url.startsWith("http://") || file.url.startsWith("https://")) {
      downloadUrl = file.url;
      needsAuth = false;
    } else {
      let filename = file.url;
      if (filename.includes("/")) filename = filename.split("/").pop();
      downloadUrl = `${API_BASE_URL}/api/file/get/${filename}`;
    }

    const response = await fetch(downloadUrl, {
      headers: needsAuth ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!response.ok) throw new Error(`Download failed: ${response.status}`);

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = getFileName(file);
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    console.error("Download error:", error);
    alert("Failed to download file");
  }
};

export const fetchSecureImages = async (attachments, setImageUrls, setImageLoading) => {
  if (!attachments || attachments.length === 0) return;

  const token = localStorage.getItem("accessToken");
  if (!token) return;

  for (const [index, file] of attachments.entries()) {
    if (file.fileType?.startsWith("image/")) {
      setImageLoading((prev) => ({ ...prev, [index]: true }));

      try {
        let imageUrl;

        if (file.url.startsWith("http://") || file.url.startsWith("https://")) {
          imageUrl = file.url;
          setImageUrls((prev) => ({ ...prev, [index]: imageUrl }));
          setImageLoading((prev) => ({ ...prev, [index]: false }));
          continue;
        }

        let filename = file.url;
        if (filename.includes("/")) filename = filename.split("/").pop();

        const fullUrl = `${API_BASE_URL}/api/file/get/${filename}`;

        const response = await fetch(fullUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) throw new Error(`Failed to load image: ${response.status}`);

        const blob = await response.blob();
        imageUrl = URL.createObjectURL(blob);
        setImageUrls((prev) => ({ ...prev, [index]: imageUrl }));
      } catch (error) {
        console.error("Error loading image:", error.message);
        setImageUrls((prev) => ({ ...prev, [index]: null }));
      } finally {
        setImageLoading((prev) => ({ ...prev, [index]: false }));
      }
    }
  }
};