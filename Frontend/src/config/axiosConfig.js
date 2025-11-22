import axios from "axios";
// Đảm bảo file token.api.js này KHÔNG import axiosInstance từ đây (tránh circular dependency)
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

// --- LOGIC XỬ LÝ CONCURRENCY (Hàng đợi request) ---
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

// Response Interceptor
axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        
        // 1. Chặn loop: Nếu URL là refresh token hoặc login thì không retry
        if (originalRequest.url.includes('/auth/refresh') || originalRequest.url.includes('/auth/login')) {
            return Promise.reject(error);
        }

        // 2. Xử lý 401 (Unauthorized)
        if (error.response?.status === 401 && !originalRequest._retry) {
            
            // Nếu đang có một tiến trình refresh chạy rồi, các request sau xếp hàng chờ
            if (isRefreshing) {
                return new Promise(function(resolve, reject) {
                    failedQueue.push({resolve, reject});
                }).then(token => {
                    originalRequest.headers['Authorization'] = 'Bearer ' + token;
                    return axiosInstance(originalRequest);
                }).catch(err => {
                    return Promise.reject(err);
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                console.log("[Axios User] Token hết hạn, gọi Refresh...");
                
                // Gọi API Refresh (Singleton đã được xử lý ở token.api.js hoặc ở đây đều ổn nhờ isRefreshing lock)
                const data = await refreshTokenApi();
                const newToken = data.accessToken;
                
                setAccessToken(newToken);
                
                console.log("[Axios User] Refresh thành công, giải phóng hàng đợi.");
                
                // Xử lý hàng đợi các request đang chờ
                processQueue(null, newToken);
                
                // Gọi lại request hiện tại
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                return axiosInstance(originalRequest);

            } catch (refreshError) {
                console.error("[Axios User] Refresh thất bại -> Logout.");
                processQueue(refreshError, null);
                setAccessToken(null);
                
                // Tùy chọn: Bắn event để AuthContext biết mà clear state ngay
                // window.dispatchEvent(new Event("auth:logout"));
                
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

axiosInstance.setAuthToken = (token) => setAccessToken(token);
axiosInstance.clearAuthToken = () => setAccessToken(null);

export default axiosInstance;