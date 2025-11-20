import mongoose from 'mongoose';
import { envConfig } from './env.config.js';

/**
 * @description Kết nối tới MongoDB cho Center Service
 */
export const connectDB = async () => {
    try {
        await mongoose.connect(envConfig.MONGODB_URI, {
            // Các tùy chọn kết nối hiện đại (thường không cần thiết từ Mongoose 6+)
            // Tuy nhiên, việc ghi rõ giúp dễ đọc.
            // useNewUrlParser: true, 
            // useUnifiedTopology: true,
        });
        console.log('✅ Connected successfully to MongoDB for Center Service.');
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error.message);
        // Thoát ứng dụng nếu kết nối DB thất bại
        process.exit(1); 
    }
};