import mongoose from "mongoose";

const fixIndex = async () => {
  try {
    await mongoose.connect("mongodb://localhost:27017/chat-system");
    console.log("✓ Connected to MongoDB");

    await mongoose.connection.collection("users").dropIndex("facebookId_1");
    console.log("✓ Old facebookId index deleted successfully");

    await mongoose.disconnect();
    console.log("✓ Done! Now restart your app.");
    process.exit(0);
  } catch (error) {
    console.error("✗ Error:", error.message);
    process.exit(1);
  }
};

fixIndex();