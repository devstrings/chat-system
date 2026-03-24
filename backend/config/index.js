import dotenv from "dotenv";

dotenv.config();

const env = (key, defaultValue) => process.env[key] || defaultValue;

const requiredEnvVars = [
  "MONGO_URI",
  "JWT_SECRET",
  "JWT_REFRESH_SECRET",
  // "SESSION_SECRET",
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


const PORT = env("PORT", 5000);

const prod_envs = ["production", "staging"];
const serverUrl = prod_envs.includes(env("NODE_ENV")) ? env("BACKEND_URL") : `http://localhost:${PORT}`;

// const googleCallbackUrl = env('GOOGLE_CALLBACK_URL') ? `${serverUrl}${env('GOOGLE_CALLBACK_URL')}` : `${serverUrl}/api/auth/google/callback`;
// const facebookCallbackUrl = env('FACEBOOK_CALLBACK_URL') ? `${serverUrl}${env('FACEBOOK_CALLBACK_URL')}` : `${serverUrl}/api/auth/facebook/callback`;

const config = {
  port: PORT,
  nodeEnv: env("NODE_ENV", "development"),
  serverUrl: serverUrl,

  mongoUri: env("MONGO_URI", "mongodb://localhost:27017/chat-system"),

  jwtSecret: env("JWT_SECRET", "your_jwt_secret"),
  jwtRefreshSecret: env("JWT_REFRESH_SECRET", "your_jwt_refresh_secret"),
  sessionSecret: env("SESSION_SECRET", "your_session_secret"),
  jwtExpiresIn: env("JWT_EXPIRES_IN", "7d"),

  redisUrl: env("REDIS_URL", "redis://localhost:6379"),

  google: {
    clientId: env("GOOGLE_CLIENT_ID"),
    clientSecret: env("GOOGLE_CLIENT_SECRET"),
  },

  facebook: {
    appId: env("FACEBOOK_APP_ID"),
    appSecret: env("FACEBOOK_APP_SECRET"),
  },

  frontend: {
    url: env("FRONTEND_URL"),

  },

  upload: {
    maxFileSize: parseInt(env("MAX_FILE_SIZE", "52428800")),
    maxImageSize: parseInt(env("MAX_IMAGE_SIZE", "5242880")),
    maxVoiceSize: parseInt(env("MAX_VOICE_SIZE", "10485760")),
  },

  email: {
    host: env("EMAIL_HOST", "smtp.gmail.com"),
    port: parseInt(env("EMAIL_PORT", "587")),
    user: env("EMAIL_USER"),
    password: env("EMAIL_PASSWORD"),
    from: env("EMAIL_FROM", "Chat System <noreply@chatsystem.com>"),
  },

  resetToken: {
    expiryMinutes: parseInt(env("RESET_TOKEN_EXPIRY", "15")),
  },
};


Object.freeze(config);

export default config;