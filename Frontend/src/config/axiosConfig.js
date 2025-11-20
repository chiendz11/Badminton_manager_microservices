import axios from "axios";
// Import hàm Singleton vừa tạo
import { refreshTokenApi } from "../apiV2/auth_service/token.api.js"; 

const API_URL = import.meta.env.VITE_API_GATEWAY_URL || "http://localhost:8080";

let accessToken = null;

function setAccessToken(token) {
    accessToken = token;
}

const axiosInstance = axios.create({
    baseURL: API_URL,
    withCredentials: true,
});

// Request Interceptor
axiosInstance.interceptors.request.use(
    (config) => {
        if (accessToken) {
            config.headers.Authorization = `Bearer ${accessToken}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response Interceptor
axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        
        // Nếu lỗi 401 và chưa retry
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                console.log("[Axios] Token hết hạn, gọi Refresh (Singleton)...");
                
                // 💡 Gọi hàm Singleton (Dù AuthContext đang gọi thì Axios cũng sẽ chờ cùng 1 promise)
                const data = await refreshTokenApi();
                
                const newToken = data.accessToken;
                setAccessToken(newToken);
                
                console.log("[Axios] Refresh thành công, retry request cũ.");
                
                // Gắn token mới và gọi lại request cũ
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                return axiosInstance(originalRequest);

            } catch (refreshError) {
                console.error("[Axios] Refresh thất bại hoàn toàn -> Logout.");
                setAccessToken(null);
                // Ném lỗi để AuthContext bắt được và xử lý logout
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

axiosInstance.setAuthToken = (token) => setAccessToken(token);
axiosInstance.clearAuthToken = () => setAccessToken(null);

export default axiosInstance;