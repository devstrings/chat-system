// statusValidation.js - All validation logic

export const validateStatusType = (type) => {
  if (!["image", "video", "text"].includes(type)) {
    return {
      isValid: false,
      statusCode: 400,
      message: "Invalid status type"
    };
  }
  return { isValid: true };
};

export const validateFileRequired = (file, type) => {
  if ((type === "image" || type === "video") && !file) {
    return {
      isValid: false,
      statusCode: 400,
      message: "File is required"
    };
  }
  return { isValid: true };
};

export const validateStatusExists = (status) => {
  if (!status) {
    return {
      isValid: false,
      statusCode: 404,
      message: "Status not found"
    };
  }
  return { isValid: true };
};

export const validateCanViewStatus = (status, viewerId) => {
  if (!status.canView(viewerId)) {
    return {
      isValid: false,
      statusCode: 403,
      message: "Cannot view this status"
    };
  }
  return { isValid: true };
};

export const validateStatusOwnership = (status, userId) => {
  if (status.userId.toString() !== userId) {
    return {
      isValid: false,
      statusCode: 403,
      message: "Unauthorized"
    };
  }
  return { isValid: true };
};

export const validateUserExists = (user) => {
  if (!user) {
    return {
      isValid: false,
      statusCode: 404,
      message: "User not found"
    };
  }
  return { isValid: true };
};