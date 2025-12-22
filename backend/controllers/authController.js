// backend/controllers/authController.js
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/userModel.js";

// Register new user
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
    res.status(500).json({ message: "Registration failed", error: err.message });
  }
};

// Login existing user
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login successful",
      token,
      username: user.username,
      profileImage: user.profileImage
    });
  } catch (err) {
    res.status(500).json({ message: "Login failed", error: err.message });
  }
};

//  GOOGLE OAUTH CALLBACK HANDLER
export const googleCallback = (req, res) => {
  try {
    const token = jwt.sign(
      { id: req.user._id, username: req.user.username },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    const profileImage = req.user.profileImage || "";
    const redirectUrl = `http://localhost:5173/auth/callback?token=${token}&username=${encodeURIComponent(req.user.username)}&profileImage=${encodeURIComponent(profileImage)}`;
    
    console.log(" Google OAuth success:", { 
      username: req.user.username, 
      email: req.user.email 
    });
    
    res.redirect(redirectUrl);
  } catch (err) {
    console.error(" Google callback error:", err);
    res.redirect("http://localhost:5173/login?error=token_generation_failed");
  }
};

//  FACEBOOK OAUTH CALLBACK HANDLER
export const facebookCallback = (req, res) => {
  try {
    const token = jwt.sign(
      { id: req.user._id, username: req.user.username },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    const profileImage = req.user.profileImage || "";
    const redirectUrl = `http://localhost:5173/auth/callback?token=${token}&username=${encodeURIComponent(req.user.username)}&profileImage=${encodeURIComponent(profileImage)}`;
    
    console.log(" Facebook OAuth success:", { 
      username: req.user.username, 
      email: req.user.email 
    });
    
    res.redirect(redirectUrl);
  } catch (err) {
    console.error(" Facebook callback error:", err);
    res.redirect("http://localhost:5173/login?error=token_generation_failed");
  }
};