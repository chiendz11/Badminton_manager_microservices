import "dotenv/config";

export const PORT = process.env.PORT || 8080;
export const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL;
export const BOOKING_SERVICE_URL = process.env.BOOKING_SERVICE_URL;
export const PAYMENT_SERVICE_URL = process.env.PAYMENT_SERVICE_URL;
export const REVIEW_SERVICE_URL = process.env.REVIEW_SERVICE_URL;
export const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:5173";
export const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret";