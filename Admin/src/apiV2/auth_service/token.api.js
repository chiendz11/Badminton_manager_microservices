import axios from "axios";

const API_URL = import.meta.env.VITE_API_GATEWAY_URL || "http://localhost:8080";

// 💡 BIẾN SINGLETON: Lưu trữ Promise đang chạy
let refreshPromise = null;

/**
 * API Refresh Token với cơ chế Singleton (Chống gọi trùng lặp)
 */
export const refreshTokenApi = () => {
    // 1. Nếu đang có request chạy, trả về promise đó luôn (không gọi mới)
    if (refreshPromise) {
        return refreshPromise;
    }

    // 2. Nếu chưa có, tạo request mới và lưu vào biến refreshPromise
    refreshPromise = axios.post(
        `${API_URL}/api/auth/refresh-token`,
        {},
        {
            withCredentials: true, // Gửi HttpOnly Cookie
            headers: { 'Content-Type': 'application/json' }
        }
    )
    .then(response => {
        // Trả về data
        return response.data;
    })
    .catch(error => {
        console.error("[TokenAPI] Refresh thất bại:", error.response?.data || error.message);
        throw error;
    })
    .finally(() => {
        // 3. Dù thành công hay thất bại, reset biến về null để lần sau gọi lại được
        refreshPromise = null;
    });

    return refreshPromise;
};