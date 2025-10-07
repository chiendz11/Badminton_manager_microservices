    // services/user.internal.service.js

import axios from 'axios';

// ⚠️ URL NỘI BỘ của User Service.
// Thường là tên dịch vụ trong Kubernetes/Docker Compose/DNS nội bộ
const USER_SERVICE_BASE_URL = process.env.USER_SERVICE_INTERNAL_URL || 'http://localhost:8085'; 

// 💡 Tạo instance Axios chuyên biệt cho giao tiếp nội bộ
const internalAxios = axios.create({
    baseURL: USER_SERVICE_BASE_URL,
    timeout: 5000, // Giới hạn thời gian chờ để tránh tắc nghẽn
    headers: {
        // 🔑 Thêm khóa API hoặc Service Token để xác thực nội bộ
        'Service-Authorization': `Bearer ${process.env.INTERNAL_SERVICE_TOKEN}` 
    }
});

// Lớp Lỗi Tùy chỉnh để xử lý lỗi Validation từ User Service
class UserValidationFailedError extends Error {
    constructor(message) {
        super(message);
        this.name = 'UserValidationFailedError';
        this.isUserValidation = true; // Cờ để Controller dễ dàng nhận diện và trả 400
    }
}


/**
 * Gửi request đồng bộ tới User Service để tạo hồ sơ người dùng mới.
 * Đây là bước quan trọng trong quá trình đăng ký (cần Rollback nếu thất bại).
 * * @param {object} profileData - Dữ liệu hồ sơ (userId, fullName, phoneNumber)
 * @returns {Promise<object>} Dữ liệu hồ sơ đã tạo
 * @throws {UserValidationFailedError} Nếu User Service trả về lỗi 400 (Validation)
 */
export const createProfile = async (profileData) => {
    try {
        const response = await internalAxios.post('/profiles', profileData);
        return response.data;
        
    } catch (error) {
        // Xử lý lỗi 400 (Validation) từ User Service
        if (error.response && error.response.status === 400) {
            // Ném lỗi tùy chỉnh để Service Layer có thể bắt và thực hiện Rollback
            throw new UserValidationFailedError(
                error.response.data.message || 'Validation failed in User Service.'
            );
        }
        
        // Ném lỗi mạng nội bộ hoặc lỗi 5xx
        console.error('Lỗi giao tiếp với User Service:', error.message);
        throw new Error('Lỗi dịch vụ nội bộ khi tạo hồ sơ người dùng.');
    }
};

// Bạn có thể thêm các hàm giao tiếp khác tại đây:
// export const updateProfile = (userId, data) => internalAxios.patch(`/profiles/${userId}`, data);