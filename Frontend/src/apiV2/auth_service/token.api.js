import axios from "axios";

const API_GATEWAY_URL = import.meta.env.VITE_API_GATEWAY_URL || "http://localhost";
const CLIENT_ID = import.meta.env.VITE_CLIENT_ID; // Ví dụ: "USER_UI_ID"

// 💡 TẠO INSTANCE RIÊNG: Chỉ dùng để refresh token
// Tránh vòng lặp dependency với axiosConfig.js
const refreshAxios = axios.create({
    baseURL: API_GATEWAY_URL,
    withCredentials: true, // Để gửi kèm cookie HttpOnly
    headers: {
        "Content-Type": "application/json",
        // 👇 QUAN TRỌNG: Gắn cứng Client ID vào header request này
        "x-client-id": CLIENT_ID, 
    },
});

// Biến Singleton để chống spam request refresh
let refreshPromise = null;

export const refreshTokenApi = () => {
    // 1. Nếu đang có request chạy, trả về promise đó luôn
    if (refreshPromise) {
        return refreshPromise;
    }

    // 2. Tạo request mới bằng instance riêng (refreshAxios)
    refreshPromise = refreshAxios.post("/api/auth/refresh-token")
        .then(response => {
            return response.data; // Trả về { accessToken, user }
        })
        .catch(error => {
            console.error("[TokenAPI] Refresh thất bại:", error.response?.data || error.message);
            throw error;
        })
        .finally(() => {
            // 3. Reset biến về null sau khi xong
            refreshPromise = null;
        });

    return refreshPromise;
};