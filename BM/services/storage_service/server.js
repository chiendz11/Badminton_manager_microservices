// server.js (Của Storage Service - ĐÃ CẬP NHẬT)

// 💡 BƯỚC 1: Tải dotenv.config() LÊN ĐẦU TIÊN
// Điều này đảm bảo tất cả các file khác (như env.config.js) 
// có thể đọc được biến môi trường ngay lập tức.
import dotenv from 'dotenv';
dotenv.config();

// ----------------------------------------------------
import app from './app.js';
import { envConfig } from './src/configs/env.config.js';

// 💡 BƯỚC 2: Import các hàm từ db.config.js
import { connectDB, syncModelIndexes } from './src/configs/db.config.js';

// 💡 BƯỚC 3: Import Models để đăng ký với Mongoose
// Phải import models TRƯỚC KHI gọi syncModelIndexes()
import './src/models/file.model.js';

// ----------------------------------------------------

const PORT = envConfig.PORT || 5002;

/**
 * @description Khởi động server
 */
const startServer = async () => {
    try {
        // 1. Kết nối DB
        await connectDB();

        // 2. Đồng bộ hóa Index (sau khi DB kết nối và Models đã được import)
        await syncModelIndexes();

        // 3. Khởi động Express App
        app.listen(PORT, () => {
            console.log("-------------------------------------------------");
            console.log(`🚀 Storage Service running on port ${PORT}`);
            console.log(`ENV: ${envConfig.NODE_ENV}`);
            console.log("-------------------------------------------------");
        });

    } catch (error) {
        console.error("❌ Lỗi nghiêm trọng khi khởi động Storage Service:", error);
        process.exit(1);
    }
};

startServer();