import axios from 'axios';
import { INTERNAL_JOB_SECRET } from '../configs/env.config.js';

const INTERNAL_SECRET = INTERNAL_JOB_SECRET;
const SERVICE_NAME = 'user-service'; // Tên của service *hiện tại* đang gọi

/**
 * @description Nhà máy (Factory) để tạo các axios client
 * dùng cho giao tiếp nội bộ (service-to-service).
 * Tự động gắn các header xác thực nội bộ.
 * * @param {string} baseURL URL gốc của service CẦN GỌI
 * @returns {axios.Instance} Một instance của Axios đã được cấu hình
 */
export const createInternalApiClient = (baseURL) => {
    if (!baseURL) {
        throw new Error("baseURL là bắt buộc khi tạo internal API client");
    }

    const apiClient = axios.create({
        baseURL: baseURL,
        headers: {
            'Content-Type': 'application/json',
            // Header xác thực nội bộ bắt buộc
            'X-Service-Secret': INTERNAL_SECRET, 
            'X-Service-Name': SERVICE_NAME,
        },
        timeout: 10000, // 10 giây timeout
    });

    // (Bạn có thể thêm interceptors ở đây nếu cần)

    return apiClient;
};