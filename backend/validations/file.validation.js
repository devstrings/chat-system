
export const validateDownloadRequest = (filename) => {
  // Prevent path traversal
  if (
    filename.includes("..") ||
    filename.includes("/") ||
    filename.includes("\\")
  ) {
    return {
      isValid: false,
      message: "Invalid filename"
    };
  }
  return { isValid: true };
};

export const validateUploadRequest = (file, conversationId) => {
  // Check if file exists
  if (!file) {
    return {
      isValid: false,
      message: "No file uploaded"
    };
  }

  if (!conversationId) {
    return {
      isValid: false,
      message: "Conversation ID required"
    };
  }

  return { isValid: true };
};