import dotenv from 'dotenv';

// Tải biến môi trường từ .env
dotenv.config();

// Xuất các giá trị hằng số của ứng dụng
export const PORT = process.env.PORT || 8081;
export const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_dev';
export const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
export const JWT_EXPIRY = process.env.JWT_EXPIRY || '15m';
export const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || '7d';
export const API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://localhost:8080';
export const PUBLIC_URL = process.env.PUBLIC_URL || 'http://localhost:3000';

// Cấu hình Email (Nodemailer)
export const EMAIL_USER = process.env.EMAIL_USER;
export const EMAIL_PASS = process.env.EMAIL_PASS;

// 💡 BIẾN MÔI TRƯỜNG NODE
export const NODE_ENV = process.env.NODE_ENV || 'development';

// 💡 BIẾN CHO GOOGLE OAUTH
export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
export const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
export const GOOGLE_OAUTH_REDIRECT_URL = process.env.GOOGLE_OAUTH_REDIRECT_URL;



// 💡 BIẾN CHO FRONTEND
// (Sử dụng FRONTEND_ORIGIN từ file .env của bạn và đổi tên nó thành FRONTEND_URL
// để nhất quán với code controller, hoặc bạn có thể đổi tên trong .env)
export const FRONTEND_URL = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
export const INTERNAL_JOB_SECRET = process.env.INTERNAL_JOB_SECRET || 'fallback_internal_secret_for_dev';
export const USER_SERVICE_INTERNAL_URL = process.env.USER_SERVICE_INTERNAL_URL || 'http://localhost:8082';

// 👇 THÊM CÁC DÒNG NÀY
export const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
export const REDIS_PORT = process.env.REDIS_PORT || 6379;
export const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;