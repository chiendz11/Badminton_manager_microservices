
import dotenv from "dotenv";
dotenv.config();

export const env = {
  port: process.env.PORT || 8086,
  mongoUri: process.env.MONGODB_URI,
  internalSecret: process.env.INTERNAL_AUTH_SECRET,
};
