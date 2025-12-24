import mongoose from "mongoose";
import { env } from "./env.config.js";

export const connectDB = async () => {
  try {
    await mongoose.connect(env.mongoUri);
    console.log("Rating Service DB Connected");
  } catch (error) {
    console.error("Rating DB Connection Error:", error);
    process.exit(1);
  }
};
export default connectDB;