// backend/config/index.js - CENTRALIZED CONFIG
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

//  Debug logs (temporary)
console.log(" Loading config...");
console.log("MONGO_URI exists:", !!process.env.MONGO_URI);
console.log("JWT_SECRET exists:", !!process.env.JWT_SECRET);

// Validate required environment variables
const requiredEnvVars = [
  'MONGO_URI',
  'JWT_SECRET',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'FACEBOOK_APP_ID',
  'FACEBOOK_APP_SECRET'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error(' Missing required environment variables:', missingVars.join(', '));
  console.error(' Make sure .env file exists in backend folder');
  process.exit(1);
}

// Export centralized config
const config = {
  // Server
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database
  mongoUri: process.env.MONGO_URI,
  
  // Authentication
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  
  // Redis
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  
  // OAuth - Google
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackUrl: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback'
  },
  
  // OAuth - Facebook
  facebook: {
    appId: process.env.FACEBOOK_APP_ID,
    appSecret: process.env.FACEBOOK_APP_SECRET,
    callbackUrl: process.env.FACEBOOK_CALLBACK_URL || 'http://localhost:5000/api/auth/facebook/callback'
  },
  
  // Frontend URLs
  frontend: {
    url: process.env.FRONTEND_URL || 'http://localhost:5173',
    callbackUrl: process.env.FRONTEND_CALLBACK_URL || 'http://localhost:5173/auth/callback',
    loginUrl: process.env.FRONTEND_LOGIN_URL || 'http://localhost:5173/login'
  },
  
  // File Upload
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024, // 50MB
    maxImageSize: parseInt(process.env.MAX_IMAGE_SIZE) || 5 * 1024 * 1024,  // 5MB
    maxVoiceSize: parseInt(process.env.MAX_VOICE_SIZE) || 10 * 1024 * 1024  // 10MB
  }
};

//  Debug log (temporary)
console.log(" Config loaded successfully");
console.log(" Port:", config.port);
console.log(" MongoDB:", config.mongoUri ? "Configured" : "Missing");

// Freeze config to prevent accidental modifications
Object.freeze(config);

export default config;