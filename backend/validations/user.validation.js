// userValidation.js - All validation logic

export const validateSearchQuery = (searchQuery) => {
  if (!searchQuery || searchQuery.trim().length === 0) {
    return {
      isValid: false,
      isEmpty: true
    };
  }
  return { isValid: true, isEmpty: false };
};

export const validateUserIsBlocked = (isBlocked) => {
  if (isBlocked) {
    return {
      isValid: false,
      statusCode: 403,
      message: "User not accessible"
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



export const validateFileUploaded = (file) => {
  if (!file) {
    return {
      isValid: false,
      statusCode: 400,
      message: "No file uploaded"
    };
  }
  return { isValid: true };
};

export const validateProfileImageUrl = (profileImage) => {
  if (!profileImage) {
    return {
      isValid: false,
      statusCode: 400,
      message: "Profile image URL is required"
    };
  }
  return { isValid: true };
};