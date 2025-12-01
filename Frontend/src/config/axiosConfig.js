import axios from "axios";
// Đảm bảo file token.api.js này KHÔNG import axiosInstance từ đây (tránh circular dependency)
import { refreshTokenApi } from "../apiV2/auth_service/token.api.js";

// 💡 SỬA LỖI: Thêm fallback. Nếu không tìm thấy biến env, mặc định dùng http://localhost
const API_URL = import.meta.env.VITE_API_GATEWAY_URL || "http://localhost";

console.log("Axios Base URL:", API_URL); // Log ra để kiểm tra

let accessToken = null;

function setAccessToken(token) {
    accessToken = token;
}

const axiosInstance = axios.create({
    baseURL: API_URL,
    withCredentials: true,
    headers: {
        "Content-Type": "application/json",
    },
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
        
        if (!originalRequest) {
             return Promise.reject(error);
        }

        // 1. Chặn loop: Nếu URL là refresh token hoặc login thì không retry
        if (originalRequest.url.includes('/auth/refresh') || originalRequest.url.includes('/auth/login')) {
            return Promise.reject(error);
        }

        // 2. Xử lý 401 (Unauthorized)
        if (error.response?.status === 401 && !originalRequest._retry) {
            
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
                // Gọi API Refresh
                const data = await refreshTokenApi();
                const newToken = data.accessToken;
                
                setAccessToken(newToken);
                
                // Xử lý hàng đợi
                processQueue(null, newToken);
                
                // Gọi lại request hiện tại
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                return axiosInstance(originalRequest);

            } catch (refreshError) {
                processQueue(refreshError, null);
                setAccessToken(null);
                
                // Điều hướng về trang login nếu cần
                // window.location.href = '/login';
                
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