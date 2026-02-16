
import * as authService from "../services/auth.service.js";
import config from "../config/index.js";

// REGISTER CONTROLLER
export const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

  

    // Service call
    const user = await authService.registerUser(username, email, password);

    res.status(201).json({
      message: "User registered successfully",
      user,
    });
  } catch (err) {
    console.error(" Registration error:", err);
    if (err.message === "Email already registered") {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: "Registration failed", error: err.message });
  }
};

// LOGIN CONTROLLER
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

   

    // Service call
    const result = await authService.loginUser(email, password);

    res.json({
      message: "Login successful",
      ...result,
    });
  } catch (err) {
    console.error(" Login error:", err);
    if (err.message === "User not found") {
      return res.status(404).json({ message: err.message });
    }
    if (err.message === "Invalid email or password") {
      return res.status(401).json({ message: err.message });
    }
    if (err.message.includes("Google or Facebook")) {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: "Login failed", error: err.message });
  }
};

// GOOGLE CALLBACK CONTROLLER
export const googleCallback = (req, res) => {
  try {
    // Service call
    const redirectUrl = authService.handleGoogleCallback(req.user);
    res.redirect(redirectUrl);
  } catch (err) {
    console.error(" Google callback error:", err);
    res.redirect(`${config.frontend.loginUrl}?error=token_generation_failed`);
  }
};

// FACEBOOK CALLBACK CONTROLLER
export const facebookCallback = (req, res) => {
  try {
    // Service call
    const redirectUrl = authService.handleFacebookCallback(req.user);
    res.redirect(redirectUrl);
  } catch (err) {
    console.error("Facebook callback error:", err);
    res.redirect(`${config.frontend.loginUrl}?error=token_generation_failed`);
  }
};

// FORGOT PASSWORD CONTROLLER
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;


    // Service call
    const result = await authService.processForgotPassword(email);

    res.json({
      message: result.message,
      ...(result.resetUrl && {
        resetUrl: result.resetUrl,
        expiresIn: result.expiresIn,
      }),
    });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({
      message: "Failed to process request",
      error: err.message,
    });
  }
};

// RESET PASSWORD CONTROLLER
export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

  

    // Service call
    const result = await authService.processResetPassword(token, newPassword);

    res.json(result);
  } catch (err) {
    console.error("Reset password error:", err);
    if (err.message === "Invalid or expired reset token") {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({
      message: "Failed to reset password",
      error: err.message,
    });
  }
};

// SET PASSWORD CONTROLLER
export const setPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    const userId = req.user.id || req.user.userId;

 

    // Service call
    const result = await authService.setUserPassword(userId, newPassword);

    res.json(result);
  } catch (err) {
    console.error("Set password error:", err);
    if (err.message === "User not found") {
      return res.status(404).json({ message: err.message });
    }
    if (err.message.includes("Change Password")) {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({
      message: "Failed to set password",
      error: err.message,
    });
  }
};

// GET CURRENT USER CONTROLLER
export const getCurrentUser = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;

    // Service call
    const userData = await authService.fetchCurrentUser(userId);

    res.json(userData);
  } catch (err) {
    console.error("Get user error:", err);
    if (err.message === "User not found") {
      return res.status(404).json({ message: err.message });
    }
    res.status(500).json({
      message: "Failed to fetch user",
      error: err.message,
    });
  }
};

// CHANGE PASSWORD CONTROLLER
export const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user.id;


    // Service call
    const result = await authService.changeUserPassword(userId, oldPassword, newPassword);

    res.json(result);
  } catch (err) {
    console.error(" Change password error:", err);
    if (err.message.includes("Set Password")) {
      return res.status(400).json({ message: err.message });
    }
    if (err.message === "Current password is incorrect") {
      return res.status(400).json({ message: err.message });
    }
    if (err.message.includes("must be different")) {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({
      message: "Failed to change password",
      error: err.message,
    });
  }
};

// REFRESH TOKEN CONTROLLER
export const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

   

    // Service call
    const result = authService.refreshAccessToken(refreshToken);

    res.json(result);
  } catch (err) {
    console.error(" Refresh token error:", err);
    return res.status(403).json({ message: "Invalid refresh token" });
  }
};