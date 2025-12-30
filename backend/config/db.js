import mongoose from "mongoose";
import config from "./index.js"; 

const connectDB = async () => {
  try {
    // Debug log
    console.log(" Connecting to MongoDB...");
    console.log(" URI:", config.mongoUri ? "Found" : "Missing");
    
    if (!config.mongoUri) {
      throw new Error("MONGO_URI is not defined in environment variables");
    }
    
    await mongoose.connect(config.mongoUri);
    console.log(" MongoDB connected");
  } catch (error) {
    console.error("Database connection failed:", error.message);
    process.exit(1);
  }
};

export default connectDB;