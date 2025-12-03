import mongoose from "mongoose";
import   {MONGODB_URI}  from "./env.config.js";

export const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Transaction Service DB Connected");
  } catch (error) {
    console.error("Transaction DB Connection Error:", error);
    process.exit(1);
  }
};
export default connectDB;