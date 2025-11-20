import { envConfig } from '../configs/env.config.js';

// Các Service được phép gọi API nội bộ của Center Service (ví dụ: GraphQL Gateway)
const ALLOWED_SERVICES = [
    'graphql-gateway', 
    'booking-service',
];

export const internalAuth = (req, res, next) => {
    const serviceSecret = req.headers['x-service-secret'];
    const serviceName = req.headers['x-service-name'];
    
    // 1. Kiểm tra Secret Key
    if (!serviceSecret || serviceSecret !== envConfig.INTERNAL_AUTH_SECRET) {
        console.warn(`[InternalAuth] Unauthorized access attempt: Invalid secret key.`);
        return res.status(403).json({ message: 'Forbidden: Invalid internal service secret.' });
    }

    // 2. Kiểm tra Tên Service
    if (!serviceName || !ALLOWED_SERVICES.includes(serviceName)) {
        console.warn(`[InternalAuth] Unauthorized access attempt: Service name '${serviceName}' not allowed.`);
        return res.status(403).json({ message: 'Forbidden: Service not recognized.' });
    }

    // 3. Đính kèm thông tin service vào request
    req.service = { name: serviceName };

    next();
};