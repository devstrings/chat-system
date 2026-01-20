// server/models/user.js
import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: true,
    unique: true,
    trim: true
  },
  email: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true,
    trim: true
  },
  password: { 
    type: String, 
    required: false  
  },
  profileImage: { 
    type: String, 
    default: null 
  },
  coverPhoto: {
    type: String,
    default: null
  },

  //  Password Reset Fields
  resetPasswordToken: {
    type: String,
    default: null
  },
  resetPasswordExpires: {
    type: Date,
    default: null
  }
  
}, { 
  timestamps: true 
});

export default mongoose.model("User", userSchema);