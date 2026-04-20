import mongoose from "mongoose";

const appSettingsSchema = new mongoose.Schema(
  {
    // CMS / Branding
    branding: {
      appName: { type: String, default: "ChatSystem" },
      logoUrl: { type: String, default: null },
      faviconUrl: { type: String, default: null },
      primaryColor: { type: String, default: "#6C63FF" },
      tagline: { type: String, default: "Connect with the world" },
    },

    // AI Feature Flags
    aiFeatures: {
      smartSearch: {
        enabled: { type: Boolean, default: false },
        model: { type: String, default: "gemini-1.5-flash" },
      },
      summarize: {
        enabled: { type: Boolean, default: false },
        model: { type: String, default: "gemini-1.5-flash" },
      },
      translate: {
        enabled: { type: Boolean, default: false },
        model: { type: String, default: "gemini-1.5-flash" },
      },
    },

    // API Keys (encrypted at service layer)
    aiProvider: {
      provider: { type: String, enum: ["gemini", "openai"], default: "gemini" },
      geminiApiKey: { type: String, default: null },
      openaiApiKey: { type: String, default: null },
    },

    // App toggles
    maintenanceMode: { type: Boolean, default: false },
    allowRegistrations: { type: Boolean, default: true },
    maxGroupSize: { type: Number, default: 100 },
  },
  { timestamps: true }
);

// Singleton helper
appSettingsSchema.statics.getOrCreate = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

export default mongoose.model("AppSettings", appSettingsSchema);
