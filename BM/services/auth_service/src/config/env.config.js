import dotenv from 'dotenv';
import e from 'express';

// Tải biến môi trường từ .env
dotenv.config();

// Xuất các giá trị hằng số của ứng dụng
export const PORT = process.env.PORT || 3001;
export const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_dev';
export const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET
export const JWT_EXPIRY = process.env.JWT_EXPIRY || '15m';
export const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || '7d';
export const API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://localhost:8080'; // Giả định URL của API Gateway

// Cấu hình Email (Nodemailer)
export const EMAIL_USER = process.env.EMAIL_USER;
export const EMAIL_PASS = process.env.EMAIL_PASS;