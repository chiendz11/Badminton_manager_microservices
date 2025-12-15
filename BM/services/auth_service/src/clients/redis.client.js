// services/auth_service/src/clients/redis.client.js

import { createClient } from 'redis';
import { REDIS_HOST, REDIS_PORT, REDIS_PASSWORD } from '../configs/env.config.js';

// 1. Tạo Client
const redisClient = createClient({
    socket: {
        host: REDIS_HOST,
        port: parseInt(REDIS_PORT) // Đảm bảo Port là số
    },
    password: REDIS_PASSWORD
});

// 2. Lắng nghe sự kiện
redisClient.on('error', (err) => console.error('[Redis Client] Error:', err));
redisClient.on('connect', () => console.log('[Redis Client] Connected! 🚀'));
redisClient.on('reconnecting', () => console.log('[Redis Client] Reconnecting...'));

// 3. Hàm kết nối (sẽ gọi ở server.js)
export const connectRedis = async () => {
    if (!redisClient.isOpen) {
        await redisClient.connect();
    }
};

export default redisClient;