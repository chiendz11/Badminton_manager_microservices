import "dotenv/config";

export const PORT = process.env.PORT || 8080;
export const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL;
export const BOOKING_SERVICE_URL = process.env.BOOKING_SERVICE_URL;
export const PAYMENT_SERVICE_URL = process.env.PAYMENT_SERVICE_URL;
export const REVIEW_SERVICE_URL = process.env.REVIEW_SERVICE_URL;
export const USER_SERVICE_URL = process.env.USER_SERVICE_URL;
export const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:5173";
export const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret";
export const ADMIN_ORIGIN = process.env.ADMIN_ORIGIN || "http://localhost:5174";
export const CENTER_SERVICE_URL = process.env.CENTER_SERVICE_URL;
export const STORAGE_SERVICE_URL = process.env.STORAGE_SERVICE_URL;
export const INTERNAL_AUTH_SECRET = process.env.INTERNAL_AUTH_SECRET