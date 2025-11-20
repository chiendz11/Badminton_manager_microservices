// src/utils/internalAxios.js

import axios from 'axios';
import { envConfig } from '../configs/env.config.js';

// Tên Service của bạn (Service đang gọi đi)
const CALLING_SERVICE_NAME = 'center-service'; 

/**
 * @description Axios Instance được cấu hình sẵn cho các cuộc gọi nội bộ (Service-to-Service).
 * Nó tự động thêm header xác thực nội bộ.
 */
const internalAxios = axios.create({
    timeout: 10000, // Thời gian chờ mặc định là 10 giây
    headers: {
        'Content-Type': 'application/json',
        // Tự động thêm Internal Secret Key
        'x-service-secret': envConfig.INTERNAL_AUTH_SECRET,
        // Tự động thêm tên Service để Service đích xác định nguồn gốc
        'x-service-name': CALLING_SERVICE_NAME, 
    }
});

export default internalAxios;