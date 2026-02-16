import dotenv from "dotenv";

dotenv.config();

console.log("Loading config...");
console.log("MONGO_URI exists:", !!process.env.MONGO_URI);
console.log("JWT_SECRET exists:", !!process.env.JWT_SECRET);

const requiredEnvVars = [
  "MONGO_URI",
  "JWT_SECRET",
  "SESSION_SECRET",  
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "FACEBOOK_APP_ID",
  "FACEBOOK_APP_SECRET",
];

const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

if (missingVars.length > 0) {
  console.error(
    " Missing required environment variables:",
    missingVars.join(", "),
  );
  console.error(" Make sure .env file exists in backend folder");
  process.exit(1);
}

const config = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || "development",

  mongoUri: process.env.MONGO_URI,

  jwtSecret: process.env.JWT_SECRET,
  sessionSecret: process.env.SESSION_SECRET,  
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",

  redisUrl: process.env.REDIS_URL || "redis://localhost:6379",

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackUrl:
      process.env.GOOGLE_CALLBACK_URL ||
      "http://localhost:5000/api/auth/google/callback",
  },

  facebook: {
    appId: process.env.FACEBOOK_APP_ID,
    appSecret: process.env.FACEBOOK_APP_SECRET,
    callbackUrl:
      process.env.FACEBOOK_CALLBACK_URL ||
      "http://localhost:5000/api/auth/facebook/callback",
  },

  frontend: {
    url: process.env.FRONTEND_URL || "http://localhost:5173",
    callbackUrl:
      process.env.FRONTEND_CALLBACK_URL ||
      "http://localhost:5173/auth/callback",
    loginUrl: process.env.FRONTEND_LOGIN_URL || "http://localhost:5173/login",
  },

  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024,
    maxImageSize: parseInt(process.env.MAX_IMAGE_SIZE) || 5 * 1024 * 1024,
    maxVoiceSize: parseInt(process.env.MAX_VOICE_SIZE) || 10 * 1024 * 1024,
  },

  email: {
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: parseInt(process.env.EMAIL_PORT) || 587,
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASSWORD,
    from: process.env.EMAIL_FROM || "Chat System <noreply@chatsystem.com>",
  },

  resetToken: {
    expiryMinutes: parseInt(process.env.RESET_TOKEN_EXPIRY) || 15,
  },
};

console.log("Config loaded successfully");
console.log("Email configured:", !!config.email.user);

Object.freeze(config);

export default config;