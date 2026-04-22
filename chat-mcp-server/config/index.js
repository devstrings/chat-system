import dotenv from "dotenv";

dotenv.config();

const env = (key, defaultValue) => process.env[key] || defaultValue;

const requiredEnvVars = [
  "NODE_ENV",
  "MCP_HTTP_PORT",

  "CHAT_API_BASE_URL",
  "CHAT_API_PERSONAL_ACCESS_TOKEN"

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

const config = {
  nodeEnv: env("NODE_ENV", "development"),

  mcp: {
    httpHost: env("MCP_HTTP_HOST", "0.0.0.0"),
    httpPort: parseInt(env("MCP_HTTP_PORT", "3100")),
    transport: env("MCP_TRANSPORT", "both"),

  },
  chat: {
    apiBaseUrl: env("CHAT_API_BASE_URL", `http://localhost:${PORT}/api`),
    personalAccessToken: env("CHAT_API_PERSONAL_ACCESS_TOKEN"),
    timeoutMs: parseInt(env("CHAT_API_TIMEOUT_MS", "10000")),
    
  }
};

Object.freeze(config);

export default config;
