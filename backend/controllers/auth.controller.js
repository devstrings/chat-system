import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/user.js";
import AuthProvider from "../models/AuthProvider.js";
import config from "../config/index.js";
import crypto from "crypto";
// Helper function
const generateToken = (userId, username) => {
  return jwt.sign({ id: userId, username }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
};

//  REGISTER
export const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      username,
      email,
      password: hashedPassword,
    });

    await AuthProvider.create({
      userId: newUser._id,
      provider: "local",
    });

    console.log(" User registered:", email);

    res.status(201).json({
      message: "User registered successfully",
      user: {
        _id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        profileImage: newUser.profileImage,
      },
    });
  } catch (err) {
    console.error(" Registration error:", err);
    res
      .status(500)
      .json({ message: "Registration failed", error: err.message });
  }
};

// LOGIN
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    let localProvider = await AuthProvider.findOne({
      userId: user._id,
      provider: "local",
    });

    // Auto-migration fallback
    if (!localProvider && user.password) {
      console.log(" Auto-creating local provider for:", email);

      localProvider = await AuthProvider.create({
        userId: user._id,
        provider: "local",
      });

      console.log(" Local provider auto-created");
    }

    if (!localProvider) {
      return res.status(400).json({
        message:
          "This account was created with Google or Facebook. Please use social login.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = generateToken(user._id, user.username);

    console.log(" User logged in:", email);

    res.json({
      message: "Login successful",
      token,
      username: user.username,
      profileImage: user.profileImage,
    });
  } catch (err) {
    console.error(" Login error:", err);
    res.status(500).json({ message: "Login failed", error: err.message });
  }
};

// GOOGLE CALLBACk
export const googleCallback = (req, res) => {
  try {
    const token = generateToken(req.user._id, req.user.username);
    const profileImage = req.user.profileImage || "";

    const redirectUrl = `${config.frontend.callbackUrl}?token=${token}&username=${encodeURIComponent(req.user.username)}&profileImage=${encodeURIComponent(profileImage)}`;

    console.log(" Google OAuth success:", req.user.email);

    res.redirect(redirectUrl);
  } catch (err) {
    console.error(" Google callback error:", err);
    res.redirect(`${config.frontend.loginUrl}?error=token_generation_failed`);
  }
};

// FACEBOOK CALLBACK
export const facebookCallback = (req, res) => {
  try {
    const token = generateToken(req.user._id, req.user.username);
    const profileImage = req.user.profileImage || "";

    const redirectUrl = `${config.frontend.callbackUrl}?token=${token}&username=${encodeURIComponent(req.user.username)}&profileImage=${encodeURIComponent(profileImage)}`;

    console.log(" Facebook OAuth success:", req.user.email);

    res.redirect(redirectUrl);
  } catch (err) {
    console.error("Facebook callback error:", err);
    res.redirect(`${config.frontend.loginUrl}?error=token_generation_failed`);
  }
};

// FORGOT PASSWORD
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Security: Don't reveal if email exists
      return res.json({
        message: "If this email exists, a reset link has been sent",
      });
    }

    // Generate secure reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // Save hashed token to database
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = new Date(
      Date.now() + config.resetToken.expiryMinutes * 60 * 1000,
    );
    await user.save();

    // Create reset URL
    const resetUrl = `${config.frontend.url}/reset-password/${resetToken}`;

    //  CONSOLE LOGGING (instead of email)
    console.log("\n" + "=".repeat(80));
    console.log(" PASSWORD RESET REQUEST");
    console.log("=".repeat(80));
    console.log(" User Email:", user.email);
    console.log(" Username:", user.username);
    console.log(" Reset Link:");
    console.log(resetUrl);
    console.log(" Expires in:", config.resetToken.expiryMinutes, "minutes");
    console.log("=".repeat(80) + "\n");

    res.json({
      message: "Password reset link generated successfully",
      //  ONLY FOR DEVELOPMENT - Remove in production
      ...(config.nodeEnv === "development" && {
        resetUrl,
        expiresIn: config.resetToken.expiryMinutes + " minutes",
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
//  RESET PASSWORD
export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res
        .status(400)
        .json({ message: "Token and new password required" });
    }

    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });
    }

    // Hash the token to compare with database
    const crypto = await import("crypto");
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    // Find user with valid token
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        message: "Invalid or expired reset token",
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and clear reset token
    user.password = hashedPassword;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    // Ensure local auth provider exists
    let localProvider = await AuthProvider.findOne({
      userId: user._id,
      provider: "local",
    });

    if (!localProvider) {
      await AuthProvider.create({
        userId: user._id,
        provider: "local",
      });
    }

    console.log(" Password reset successful for:", user.email);

    res.json({ message: "Password reset successful" });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({
      message: "Failed to reset password",
      error: err.message,
    });
  }
};

// SET PASSWORD
export const setPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    const userId = req.user.id || req.user.userId;

    if (!newPassword) {
      return res.status(400).json({ message: "New password is required" });
    }

    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    //Check only if password already exists
    if (user.password) {
      return res.status(400).json({
        message: "You already have a password. Use 'Change Password' instead.",
      });
    }

    // Hash and set password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    // Create local auth provider if doesn't exist
    const localProvider = await AuthProvider.findOne({
      userId: user._id,
      provider: "local",
    });

    if (!localProvider) {
      await AuthProvider.create({
        userId: user._id,
        provider: "local",
      });
    }

    console.log(" Password set for SSO user:", user.email);

    res.json({ message: "Password set successfully" });
  } catch (err) {
    console.error("Set password error:", err);
    res.status(500).json({
      message: "Failed to set password",
      error: err.message,
    });
  }
};
//  GET CURRENT USER INFO (with auth provider details)
export const getCurrentUser = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;

    const user = await User.findById(userId).select(
      "-resetPasswordToken -resetPasswordExpires",
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check password existence properly
    const hasPassword = !!(user.password && user.password.length > 0);

    // Check all auth providers for this user
    const authProviders = await AuthProvider.find({ userId: user._id });

    const hasLocalAuth = authProviders.some((p) => p.provider === "local");
    const hasGoogleAuth = authProviders.some((p) => p.provider === "google");
    const hasFacebookAuth = authProviders.some(
      (p) => p.provider === "facebook",
    );

    const primaryProvider =
      authProviders.length > 0 ? authProviders[0].provider : "local";

    // : Console log for debugging
    console.log(" User Check:", {
      email: user.email,
      hasPasswordInDB: hasPassword,
      passwordField: user.password ? "EXISTS" : "NULL",
      hasLocalAuth,
      primaryProvider,
    });

    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      profileImage: user.profileImage,
      coverPhoto: user.coverPhoto,
      hasPassword, //  This should be true if password exists
      hasLocalAuth,
      hasGoogleAuth,
      hasFacebookAuth,
      primaryProvider,
      createdAt: user.createdAt,
    });
  } catch (err) {
    console.error("Get user error:", err);
    res.status(500).json({
      message: "Failed to fetch user",
      error: err.message,
    });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user.id;

    // Validation
    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        message: "Old and new password required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters",
      });
    }

    // Get user
    const user = await User.findById(userId);
    if (!user || !user.password) {
      return res.status(400).json({
        message: "No password set. Use 'Set Password' first.",
      });
    }

    // Verify old password
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({
        message: "Current password is incorrect",
      });
    }

    // Check if new password is same as old
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return res.status(400).json({
        message: "New password must be different from current password",
      });
    }

    // Hash and update password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    console.log(" Password changed for:", user.email);

    res.json({ message: "Password changed successfully" });
  } catch (err) {
    console.error(" Change password error:", err);
    res.status(500).json({
      message: "Failed to change password",
      error: err.message,
    });
  }
};
