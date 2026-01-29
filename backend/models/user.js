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
  },
   //   STATUS FIELDS
  statusPrivacy: {
    type: String,
    enum: ["contacts", "except", "only"],
    default: "contacts"
  },
  mutedStatuses: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  ]
}, { 
  timestamps: true 
});

export default mongoose.model("User", userSchema);