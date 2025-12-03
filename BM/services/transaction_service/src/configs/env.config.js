import dotenv from "dotenv";
dotenv.config();

export const PORT = process.env.PORT || 8087;
export const MONGODB_URI = process.env.MONGODB_URI;
export const INVENTORY_SERVICE_URL = process.env.INVENTORY_SERVICE_URL;
export const INTERNAL_JOB_SECRET = process.env.INTERNAL_JOB_SECRET;


export const env = {
  internalSecret: process.env.INTERNAL_AUTH_SECRET,
};
