import { envConfig } from '../configs/env.config.js';

/**
 * @description Middleware xác thực cuộc gọi nội bộ giữa các Microservice.
 * Service gọi phải gửi header X-Service-Secret và X-Service-Name.
 */
export const internalAuth = (req, res, next) => {
    const serviceSecret = req.headers['x-service-secret'];
    const serviceName = req.headers['x-service-name'];
    
    // 1. Kiểm tra Secret
    if (serviceSecret !== envConfig.INTERNAL_AUTH_SECRET) {
        return res.status(401).json({ message: 'Unauthorized internal service access: Invalid Secret.' });
    }

    // 2. Kiểm tra tên Service có được phép gọi không
    const allowedServices = envConfig.ALLOWED_INTERNAL_SERVICES;
    if (!serviceName || !allowedServices.includes(serviceName)) {
        return res.status(403).json({ 
            message: 'Unauthorized internal service access: Service name not permitted.' 
        });
    }

    // Gán thông tin service vào request để Controller có thể sử dụng
    req.serviceName = serviceName;
    next();
};