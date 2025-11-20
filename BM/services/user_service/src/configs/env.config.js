import dotenv from 'dotenv';
dotenv.config();

export const PORT = process.env.PORT || 8085; // Cổng 8085 từ .env
export const JWT_SECRET = process.env.JWT_SECRET;
export const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
export const JWT_EXPIRY = process.env.JWT_EXPIRY || '15m';
export const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || '7d';
export const API_GATEWAY_URL = process.env.API_GATEWAY_URL;

// 💡 1. SỬA LẠI TÊN BIẾN ĐỂ KHỚP VỚI .ENV
export const MONGODB_URI = process.env.DATABASE_URL; // Đọc DATABASE_URL

// 💡 2. THÊM SECRET NỘI BỘ
export const INTERNAL_JOB_SECRET = process.env.INTERNAL_JOB_SECRET;

export const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
export const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
export const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;
export const DEFAULT_AVATAR_FILE_ID = process.env.DEFAULT_AVATAR_FILE_ID;
export const DEFAULT_AVATAR_URL = process.env.DEFAULT_AVATAR_URL;
export const STORAGE_SERVICE_URL = process.env.STORAGE_SERVICE_URL || 'http://localhost:5002'; // URL nội bộ/k8s của Storage Service

// 💡 3. KIỂM TRA CÁC BIẾN QUAN TRỌNG
if (!MONGODB_URI) {
    console.error("LỖI: DATABASE_URL (MONGODB_URI) chưa được cấu hình cho UserService!");
    process.exit(1);
}

if (!INTERNAL_JOB_SECRET) {
    console.error("LỖI: INTERNAL_JOB_SECRET chưa được cấu hình cho UserService!");
    process.exit(1);
}

if (!JWT_SECRET) {
    console.error("LỖI: JWT_SECRET chưa được cấu hình cho UserService!");
    process.exit(1);
}