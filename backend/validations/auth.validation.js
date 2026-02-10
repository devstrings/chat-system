
export const validateRegister = (username, email, password) => {
  if (!username || !email || !password) {
    return {
      isValid: false,
      message: "All fields are required"
    };
  }
  return { isValid: true };
};

export const validateLogin = (email, password) => {
  if (!email || !password) {
    return {
      isValid: false,
      message: "Email and password required"
    };
  }
  return { isValid: true };
};

export const validateForgotPassword = (email) => {
  if (!email) {
    return {
      isValid: false,
      message: "Email is required"
    };
  }
  return { isValid: true };
};

export const validateResetPassword = (token, newPassword) => {
  if (!token || !newPassword) {
    return {
      isValid: false,
      message: "Token and new password required"
    };
  }

  if (newPassword.length < 6) {
    return {
      isValid: false,
      message: "Password must be at least 6 characters"
    };
  }

  return { isValid: true };
};

export const validateSetPassword = (newPassword) => {
  if (!newPassword) {
    return {
      isValid: false,
      message: "New password is required"
    };
  }

  if (newPassword.length < 6) {
    return {
      isValid: false,
      message: "Password must be at least 6 characters"
    };
  }

  return { isValid: true };
};

export const validateChangePassword = (oldPassword, newPassword) => {
  if (!oldPassword || !newPassword) {
    return {
      isValid: false,
      message: "Old and new password required"
    };
  }

  if (newPassword.length < 6) {
    return {
      isValid: false,
      message: "Password must be at least 6 characters"
    };
  }

  return { isValid: true };
};

export const validateRefreshToken = (refreshToken) => {
  if (!refreshToken) {
    return {
      isValid: false,
      message: "Refresh token required"
    };
  }
  return { isValid: true };
};