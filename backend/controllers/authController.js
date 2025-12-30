import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/user.js";
import AuthProvider from "../models/AuthProvider.js";
import config from "../config/index.js"; 

// Helper function
const generateToken = (userId, username) => {
  return jwt.sign(
    { id: userId, username },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
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
      provider: "local"
    });

    console.log(" User registered:", email);

    res.status(201).json({
      message: "User registered successfully",
      user: {
        _id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        profileImage: newUser.profileImage
      }
    });
  } catch (err) {
    console.error(" Registration error:", err);
    res.status(500).json({ message: "Registration failed", error: err.message });
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
      provider: "local"
    });

    // Auto-migration fallback
    if (!localProvider && user.password) {
      console.log(" Auto-creating local provider for:", email);
      
      localProvider = await AuthProvider.create({
        userId: user._id,
        provider: "local"
      });
      
      console.log(" Local provider auto-created");
    }

    if (!localProvider) {
      return res.status(400).json({
        message: "This account was created with Google or Facebook. Please use social login."
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
      profileImage: user.profileImage
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