
import dotenv from "dotenv";
dotenv.config();

export const env = {
  port: process.env.PORT || 8089,
  mongoUri: process.env.MONGODB_URI,
  internalSecret: process.env.INVENTORY_INTERNAL_AUTH_SECRET,
};
