import mongoose from "mongoose";

let isConnected = false;

export async function connectDB() {
  if (isConnected) {
    return true;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn(
      "[Database Warning]: MONGODB_URI is not set in environment variables. Running with secure in-memory database fallback."
    );
    return false;
  }

  try {
    // Prevent multiple connections
    if (mongoose.connection.readyState === 1) {
      isConnected = true;
      return true;
    }

    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    
    isConnected = true;
    console.log("Successfully connected to MongoDB Atlas!");
    return true;
  } catch (error) {
    console.error("Failed to connect to MongoDB Atlas:", error);
    console.warn("Falling back to interactive in-memory database store.");
    return false;
  }
}

export function isMongoConnected() {
  return isConnected && mongoose.connection.readyState === 1;
}
