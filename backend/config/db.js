import mongoose from "mongoose";
import { config } from "./index.js";

const connectDB = async () => {
  try {
    await mongoose.connect(config.mongoURI);
    console.log(" MongoDB connected");
  } catch (error) {
    console.error(" Database connection failed:", error);
    process.exit(1);
  }
};

export default connectDB;
