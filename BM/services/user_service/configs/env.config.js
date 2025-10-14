import dotenv from 'dotenv';
dotenv.config();

export const PORT = process.env.PORT || 8082;
export const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_dev';
export const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET
export const JWT_EXPIRY = process.env.JWT_EXPIRY || '15m';
export const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || '7d';
export const API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://localhost:8080'; // Giả định URL của API Gateway
export const DB_URI = process.env.DB_URI || 'mongodb://localhost:27017/user_service'; // Giả định URI MongoDB

