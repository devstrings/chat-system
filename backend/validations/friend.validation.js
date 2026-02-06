// friendValidation.js - All validation logic

export const validateSendFriendRequest = (senderId, receiverId) => {
  if (!receiverId) {
    return {
      isValid: false,
      message: "Receiver ID required"
    };
  }

  if (senderId === receiverId) {
    return {
      isValid: false,
      message: "Cannot send request to yourself"
    };
  }

  return { isValid: true };
};

export const validateBlockUser = (blockerId, userId) => {
  if (!userId) {
    return {
      isValid: false,
      message: "User ID required"
    };
  }

  if (blockerId === userId) {
    return {
      isValid: false,
      message: "Cannot block yourself"
    };
  }

  return { isValid: true };
};

export const validateAcceptRequest = (friendRequest, currentUserId) => {
  if (!friendRequest) {
    return {
      isValid: false,
      statusCode: 404,
      message: "Request not found"
    };
  }

  if (friendRequest.receiver.toString() !== currentUserId) {
    return {
      isValid: false,
      statusCode: 403,
      message: "Unauthorized"
    };
  }

  if (friendRequest.status !== "pending") {
    return {
      isValid: false,
      statusCode: 400,
      message: "Request already processed"
    };
  }

  return { isValid: true };
};

export const validateRejectRequest = (friendRequest, currentUserId) => {
  if (!friendRequest) {
    return {
      isValid: false,
      statusCode: 404,
      message: "Request not found"
    };
  }

  if (friendRequest.receiver.toString() !== currentUserId) {
    return {
      isValid: false,
      statusCode: 403,
      message: "Unauthorized"
    };
  }

  return { isValid: true };
};