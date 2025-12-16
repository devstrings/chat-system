import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: true 
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
  
  googleId: {
    type: String,
    default: null,
     unique: true,      
    sparse: true 
  },
  facebookId: {
    type: String,
    default: null,
     unique: true,      
    sparse: true 
  },
  provider: {
    type: String,
    enum: ["local", "google", "facebook"],
    default: "local"
  }
}, { 
  timestamps: true 
});

export default mongoose.model("User", userSchema);