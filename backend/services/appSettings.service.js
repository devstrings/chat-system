import crypto from "crypto";
import AppSettings from "#models/AppSettings";

const ENCRYPTION_KEY = process.env.SETTINGS_ENCRYPTION_KEY || "chat-system-32-byte-secret-key!!"; // 32 bytes
const IV_LENGTH = 16;

// --- Encryption helpers ---
const encrypt = (text) => {
  if (!text) return null;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(ENCRYPTION_KEY), iv);
  const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
};

const decrypt = (encryptedText) => {
  if (!encryptedText) return null;
  try {
    const [ivHex, encHex] = encryptedText.split(":");
    const iv = Buffer.from(ivHex, "hex");
    const encryptedBuffer = Buffer.from(encHex, "hex");
    const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(ENCRYPTION_KEY), iv);
    const decrypted = Buffer.concat([decipher.update(encryptedBuffer), decipher.final()]);
    return decrypted.toString();
  } catch {
    return null;
  }
};

// --- Settings CRUD ---
export const getSettings = async () => {
  return AppSettings.getOrCreate();
};

export const updateSettings = async (patch) => {
  let settings = await AppSettings.getOrCreate();

  // Encrypt API keys if being updated
  if (patch?.aiProvider?.geminiApiKey) {
    patch.aiProvider.geminiApiKey = encrypt(patch.aiProvider.geminiApiKey);
  }
  if (patch?.aiProvider?.openaiApiKey) {
    patch.aiProvider.openaiApiKey = encrypt(patch.aiProvider.openaiApiKey);
  }

  // Deep merge patch into settings
  const merge = (target, source) => {
    for (const key of Object.keys(source)) {
      if (source[key] !== null && typeof source[key] === "object" && !Array.isArray(source[key])) {
        if (!target[key]) target[key] = {};
        merge(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    }
  };

  merge(settings, patch);
  settings.markModified("branding");
  settings.markModified("aiFeatures");
  settings.markModified("aiProvider");
  await settings.save();
  return settings;
};

// Get settings with decrypted keys (for AI service use only — never returned to frontend as-is)
export const getSettingsWithDecryptedKeys = async () => {
  const settings = await getSettings();
  const plain = settings.toObject();
  if (plain.aiProvider?.geminiApiKey) {
    plain.aiProvider.geminiApiKey = decrypt(plain.aiProvider.geminiApiKey);
  }
  if (plain.aiProvider?.openaiApiKey) {
    plain.aiProvider.openaiApiKey = decrypt(plain.aiProvider.openaiApiKey);
  }
  return plain;
};

// Returns settings safe for frontend (masks API keys)
export const getPublicSettings = async () => {
  const settings = (await getSettings()).toObject();
  if (settings.aiProvider?.geminiApiKey) {
    settings.aiProvider.geminiApiKey = "••••••••";
  }
  if (settings.aiProvider?.openaiApiKey) {
    settings.aiProvider.openaiApiKey = "••••••••";
  }
  return settings;
};
