// 💡 1. IMPORT "FACTORY" TỪ FILE CORE MỚI
import { createInternalApiClient } from '../utils/internal.api.js';
// 💡 2. IMPORT URL CỤ THỂ TỪ CONFIG
import { USER_SERVICE_INTERNAL_URL } from '../configs/env.config.js';

// 💡 3. TẠO RA CLIENT CHỈ DÀNH RIÊNG CHO USER SERVICE
// (Hàm createInternalApiClient đã tự động đính kèm secret và interceptor)
const userApiClient = createInternalApiClient(USER_SERVICE_INTERNAL_URL);

/**
 * Client để giao tiếp nội bộ với UserService
 */
export const UserService = { // (Đổi tên từ InternalUserService)

    /**
     * Gọi sang UserService để tạo một User Profile mới.
     * Dữ liệu này (data) bao gồm { userId, name, phone_number, email, username }
     */
    createProfile: async (data) => {
        // 💡 4. KHÔNG CẦN TRY...CATCH NỮA!
        // Interceptor trong 'internalApiClient.js' sẽ
        // tự động xử lý lỗi 409, 500... và throw error.
        // auth.service.js (nơi gọi hàm này) sẽ bắt lỗi đó.

        // 💡 5. SỬ DỤNG CLIENT ĐÃ TẠO
        // (Interceptor sẽ tự động trả về response.data nếu thành công)
        const responseData = await userApiClient.post('/internal/users', data);
        return responseData;
    }
};