// src/app.js (Cập nhật - Loại bỏ CORS)

import express from 'express';
import helmet from 'helmet';
import centerRoutes from './src/routes/center.route.js';
import { envConfig } from './src/configs/env.config.js';

const app = express();

app.use(helmet()); 
app.use(express.json()); // Cho phép Express đọc body JSON

// Logging cơ bản
app.use((req, res, next) => {
    // Giữ lại logging để theo dõi request nội bộ
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// Định nghĩa các Route
app.get('/', (req, res) => {
    res.status(200).json({ 
        service: 'Center Service',
        status: 'Operational',
        version: '1.0' 
    });
});
// Center Service chỉ tiếp nhận traffic từ Internal Network (API Gateway)
app.use('/api/v1/centers', centerRoutes);

// Xử lý lỗi tập trung
app.use((err, req, res, next) => {
    console.error('SERVER ERROR:', err.stack);
    // Dùng err.cause nếu có (từ Service layer) để xác định status code
    const statusCode = err.cause || err.status || 500;
    
    res.status(statusCode).json({
        message: err.message || 'Internal Server Error',
        // Chỉ trả về chi tiết lỗi trong môi trường dev
        error: envConfig.NODE_ENV === 'development' ? err : {}
    });
});

export default app;