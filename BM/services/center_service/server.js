import app from './app.js';
import { connectDB } from './src/configs/db.config.js'; // 💡 Import hàm kết nối DB
import { envConfig } from './src/configs/env.config.js';

const PORT = envConfig.PORT || 5003;

/**
 * @description Khởi động server: Kết nối DB sau đó lắng nghe cổng
 */
const startServer = async () => {
    // 1. Kết nối DB
    await connectDB();
    
    // 2. Lắng nghe cổng
    app.listen(PORT, () => {
        console.log(`🚀 Center Service running on port ${PORT}`);
        console.log(`ENV: ${envConfig.NODE_ENV}`);
    });
};

startServer();