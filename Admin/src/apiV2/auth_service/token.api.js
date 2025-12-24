import axios from "axios";

const API_GATEWAY_URL = import.meta.env.VITE_API_GATEWAY_URL || "http://localhost:8080";
const CLIENT_ID = import.meta.env.VITE_CLIENT_ID;

// 💡 TẠO INSTANCE RIÊNG: Chỉ dùng để refresh token
// Việc này giúp tránh vòng lặp dependency với axiosConfig.js
const refreshAxios = axios.create({
    baseURL: API_GATEWAY_URL,
    withCredentials: true, // Để gửi kèm cookie
    headers: {
        "Content-Type": "application/json",
        // 👇 QUAN TRỌNG: Header này giúp BE biết đọc cookie nào
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

    // 2. Tạo request mới
    refreshPromise = refreshAxios.post("/api/auth/refresh-token")
        .then(response => {
            return response.data; // Trả về { accessToken, user }
        })
        .catch(error => {
            console.error("[TokenAPI] Refresh thất bại:", error);
            throw error;
        })
        .finally(() => {
            // 3. Reset biến về null sau khi xong
            refreshPromise = null;
        });

    return refreshPromise;
};