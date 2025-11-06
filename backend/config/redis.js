import { createClient } from "redis";
import dotenv from "dotenv";
dotenv.config();

// Create one shared Redis client
export const redisClient = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});

redisClient.on("error", (err) => console.error(" Redis Client Error:", err));
redisClient.on("connect", () => console.log("Connecting to Redis..."));
redisClient.on("ready", () => console.log(" Redis is ready!"));

// Function to connect once (called in server.js)
export async function connectRedis() {
  try {
    await redisClient.connect();
    console.log(" Connected to Redis");
  } catch (error) {
    console.error("Redis connection failed:", error);
    console.log(" Continuing without Redis (online status disabled)");
  }
}
