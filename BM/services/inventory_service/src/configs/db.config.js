import mongoose from "mongoose";
import { env, MONGODB_URI } from "./env.config.js";

export const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("InventoryService Service DB Connected");
  } catch (error) {
    console.error("InventoryService DB Connection Error:", error);
    process.exit(1);
  }
};
export default connectDB;