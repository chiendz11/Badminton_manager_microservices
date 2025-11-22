import express from 'express';
import helmet from 'helmet';
import storageRoutes from './src/routes/storage.route.js';
import { envConfig } from './src/configs/env.config.js';

const app = express();

// Middleware bảo mật và tối ưu
app.use(helmet());
app.use(express.json()); // Cho phép Express đọc body JSON

// Logging cơ bản
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// Định nghĩa các Route
app.get('/', (req, res) => {
    res.status(200).json({
        service: 'Storage Service',
        status: 'Operational',
        version: '1.0'
    });
});
app.use('/api/v1', storageRoutes);

// Xử lý lỗi tập trung
app.use((err, req, res, next) => {
    console.error('SERVER ERROR:', err.stack);
    res.status(err.status || 500).json({
        message: err.message || 'Internal Server Error',
        error: envConfig.NODE_ENV === 'development' ? err : {}
    });
});

export default app;