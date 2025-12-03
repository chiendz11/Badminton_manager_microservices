import dotenv from "dotenv";
dotenv.config();

export const PORT = process.env.PORT || 8086;
export const MONGODB_URI = process.env.MONGODB_URI;
export const INTERNAL_JOB_SECRET = process.env.INTERNAL_JOB_SECRET;

export const env = {
  internalSecret: process.env.INTERNAL_AUTH_SECRET,
};
