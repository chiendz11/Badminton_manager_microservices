import axios from "axios";
// Đảm bảo file này KHÔNG import axiosInstance từ axiosConfig.js
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

axiosInstance.interceptors.request.use(
    (config) => {
        if (accessToken) {
            config.headers.Authorization = `Bearer ${accessToken}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Biến cờ để tránh retry quá nhiều lần cùng lúc (Concurrency lock)
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

axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        
        // 1. Chặn loop: Nếu URL là refresh token hoặc login thì không retry
        if (originalRequest.url.includes('/auth/refresh') || originalRequest.url.includes('/auth/login')) {
            return Promise.reject(error);
        }

        // 2. Xử lý 401
        if (error.response?.status === 401 && !originalRequest._retry) {
            if (isRefreshing) {
                // Nếu đang refresh, các request khác xếp hàng chờ
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
                console.log("[Axios] Token hết hạn, gọi Refresh...");
                
                const data = await refreshTokenApi();
                const newToken = data.accessToken;
                setAccessToken(newToken);
                
                console.log("[Axios] Refresh thành công, retry queue.");
                processQueue(null, newToken);
                
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                return axiosInstance(originalRequest);

            } catch (refreshError) {
                console.error("[Axios] Refresh thất bại -> Logout.");
                processQueue(refreshError, null);
                setAccessToken(null);
                // 💡 Quan trọng: Không redirect cứng window.location ở đây để tránh loop reload
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