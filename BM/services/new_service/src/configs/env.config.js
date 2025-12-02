import dotenv from "dotenv";
dotenv.config();

export const env = {
  port: process.env.PORT || 5001,
  mongoUri: process.env.MONGODB_URI,
  internalSecret: process.env.INTERNAL_AUTH_SECRET,
};
