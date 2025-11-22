import dotenv from 'dotenv';
dotenv.config();

/**
 * @description Biến môi trường của Center Service
 */
export const envConfig = {
    PORT: process.env.PORT || 5003,
    NODE_ENV: process.env.NODE_ENV || 'development',
    MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/center_db',
    CORS_ORIGIN: process.env.CORS_ORIGIN || '*',

    // Cần thiết cho xác thực token nội bộ giữa các service
    INTERNAL_AUTH_SECRET: process.env.INTERNAL_AUTH_SECRET || 'your_super_secret_internal_key',
    
    // 💡 DEFAULT LOGO ID
    DEFAULT_LOGO_FILE_ID: process.env.DEFAULT_LOGO_FILE_ID || 'fallback_default_logo_id',

    // 💡 API CỦA CÁC SERVICE KHÁC (Cần để gọi Storage Service)
    STORAGE_SERVICE_URL: process.env.STORAGE_SERVICE_URL || 'http://localhost:5002/api/v1/storage',
    ALLOWED_INTERNAL_SERVICES: process.env.ALLOWED_INTERNAL_SERVICES || '',
    
};