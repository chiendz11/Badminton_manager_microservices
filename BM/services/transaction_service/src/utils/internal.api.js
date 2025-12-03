import axios from 'axios';
// 💡 Sửa đường dẫn import
import { INTERNAL_JOB_SECRET } from '../configs/env.config.js';

/**
 * Hàm này tạo ra một "client" (một axios instance)
 * đã được cấu hình sẵn để giao tiếp nội bộ một cách an toàn.
 * @param {string} baseURL - URL gốc của microservice cần gọi (vd: 'http://localhost:8085')
 * @returns {axios.AxiosInstance}
 */
export const createInternalApiClient = (baseURL) => {

    if (!baseURL) {
        throw new Error("Không thể tạo internal client mà không có baseURL.");
    }

    if (!INTERNAL_JOB_SECRET) {
        // Cảnh báo nhưng vẫn cho chạy, vì dev local có thể không cần
        console.warn("CẢNH BÁO: INTERNAL_JOB_SECRET chưa được set. Giao tiếp nội bộ không an toàn.");
    }

    const client = axios.create({
        baseURL: baseURL,
        headers: {
            'Content-Type': 'application/json',
            // Gửi một "mật khẩu nội bộ" để service nhận
            // request biết đây là một service "anh em"
            'x-internal-secret': INTERNAL_JOB_SECRET
        },
        timeout: 5000 // Chờ 5 giây
    });

    // 💡 --- THÊM INTERCEPTOR --- 💡
    // Interceptor này sẽ tự động "bóc tách" response
    // và xử lý lỗi tập trung.
    client.interceptors.response.use(
        (response) => {
            // Request thành công (2xx) - Chỉ trả về data
            return response.data;
        },
        (error) => {
            // 💡 Xử lý lỗi tập trung (4xx, 5xx, lỗi mạng)
            if (error.response) {
                // Service đích trả về lỗi (409, 400, 500...)
                // Ném (throw) lỗi với message từ service đó
                // auth.service.js (saga) sẽ bắt được lỗi này
                throw new Error(
                    error.response.data.message ||
                    `Lỗi ${error.response.status} từ ${error.config.baseURL}`
                );
            } else if (error.request) {
                // Lỗi không kết nối được (service bị sập, sai URL)
                throw new Error(`Không thể kết nối đến service tại ${error.config.baseURL}`);
            } else {
                // Lỗi không xác định
                throw new Error(`Lỗi axios không xác định: ${error.message}`);
            }
        }
    );

    return client;
};