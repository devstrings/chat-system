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

  resetPasswordToken: {
    type: String,
    default: null
  },
  resetPasswordExpires: {
    type: Date,
    default: null
  },
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
  ],
  isEmailVerified: 
  { type: Boolean, default: false },
emailOTP: 
{ type: String, default: null },
emailOTPExpires:
 { type: Date, default: null },

publicKey: {
  type: String,
  default: ""
},
keyBackup: {
  publicKey: {
    type: String,
    default: "",
  },
  privateKey: {
    type: String,
    default: "",
  },
  updatedAt: {
    type: Date,
    default: null,
  },
},
twoFactorEnabled: {
  type: Boolean,
  default: false
},
twoFactorMethod: {
  type: String,
  enum: ["totp", "email", null],
  default: null
},
totpSecretEncrypted: {
  type: String,
  default: null
},
totpSecretIv: {
  type: String,
  default: null
},
totpSecretAuthTag: {
  type: String,
  default: null
},
totpTempSecretEncrypted: {
  type: String,
  default: null
},
totpTempSecretIv: {
  type: String,
  default: null
},
totpTempSecretAuthTag: {
  type: String,
  default: null
},
email2faOtpHash: {
  type: String,
  default: null
},
email2faOtpExpiresAt: {
  type: Date,
  default: null
},
email2faOtpAttempts: {
  type: Number,
  default: 0
},
twoFactorVerifiedAt: {
  type: Date,
  default: null
},
recoveryCodes: {
  type: [String],
  default: []
},

role: {
  type: String,
  enum: ["user", "admin"],
  default: "user"
},
isSuspended: {
  type: Boolean,
  default: false
},

}, { 
  timestamps: true 
});

export default mongoose.model("User", userSchema);