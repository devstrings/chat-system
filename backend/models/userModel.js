// backend/models/userModel.js
import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: true,
    unique: true  // Username bhi unique hona chahiye
  },
  email: { 
    type: String, 
    required: true, 
    unique: true 
  },
  password: { 
    type: String, 
    required: true 
  },
  profileImage: { 
    type: String, 
    default: null 
  },
  
  //  OAuth fields with proper sparse indexing
  googleId: {
    type: String,
    sparse: true,    
    unique: true    
  },
  facebookId: {
    type: String,
    sparse: true,
    unique: true
  },
  provider: {
    type: String,
    enum: ["local", "google", "facebook"],
    default: "local"
  }
}, { 
  timestamps: true 
});

// Explicitly create sparse indexes (best practice)
userSchema.index({ googleId: 1 }, { sparse: true, unique: true });
userSchema.index({ facebookId: 1 }, { sparse: true, unique: true });

export default mongoose.model("User", userSchema);