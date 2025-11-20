import dotenv from 'dotenv';
dotenv.config();

/**
 * @description Biến môi trường của Storage Service
 */
export const envConfig = {
    PORT: process.env.PORT || 5002,
    NODE_ENV: process.env.NODE_ENV || 'development',
    MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/storage_db',
    CORS_ORIGIN: process.env.CORS_ORIGIN || '*',

    // Cấu hình Cloudinary (SOT của service này)
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,

    // Cần thiết cho xác thực token nội bộ giữa các service
    INTERNAL_AUTH_SECRET: process.env.INTERNAL_JOB_SECRET || 'your_super_secret_internal_key',
    ALLOWED_INTERNAL_SERVICES: process.env.ALLOWED_INTERNAL_SERVICES ? process.env.ALLOWED_INTERNAL_SERVICES.split(',') : ['user-service', 'center-service'],
};