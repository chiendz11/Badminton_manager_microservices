import axios from "axios";
// Import API refresh từ file vừa sửa ở trên
import { refreshTokenApi } from "../apiV2/auth_service/token.api.js"; 

const API_URL = import.meta.env.VITE_API_GATEWAY_URL;
const CLIENT_ID = import.meta.env.VITE_CLIENT_ID;

let accessToken = null;

const axiosInstance = axios.create({
    baseURL: API_URL,
    withCredentials: true,
    headers: {
        "Content-Type": "application/json",
    },
});

// --- HELPER FUNCTIONS ---
axiosInstance.setAuthToken = (token) => { accessToken = token; };
axiosInstance.clearAuthToken = () => { accessToken = null; };

// --- REQUEST INTERCEPTOR ---
axiosInstance.interceptors.request.use(
    (config) => {
        // 1. Gắn Access Token
        if (accessToken) {
            config.headers.Authorization = `Bearer ${accessToken}`;
        }
        // 2. Gắn Client ID (Bắt buộc cho mọi request nghiệp vụ)
        if (CLIENT_ID) {
            config.headers['x-client-id'] = CLIENT_ID;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// --- LOGIC QUEUE (Concurrency Lock) ---
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach(prom => {
        if (error) prom.reject(error);
        else prom.resolve(token);
    });
    failedQueue = [];
};

// --- RESPONSE INTERCEPTOR ---
axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        
        if (!originalRequest) return Promise.reject(error);

        // Whitelist các API không cần retry
        const PUBLIC_APIS = ['/auth/login', '/auth/refresh-token'];
        if (PUBLIC_APIS.some(url => originalRequest.url.includes(url))) {
            return Promise.reject(error);
        }

        // Xử lý 401 (Token hết hạn)
        if (error.response?.status === 401 && !originalRequest._retry) {
            
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                }).then(token => {
                    originalRequest.headers['Authorization'] = 'Bearer ' + token;
                    return axiosInstance(originalRequest);
                }).catch(err => Promise.reject(err));
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                // Gọi API Refresh (File token.api.js đã có header x-client-id)
                const data = await refreshTokenApi();
                const newToken = data.accessToken;
                
                // Cập nhật token mới
                axiosInstance.setAuthToken(newToken);
                
                // Xử lý hàng đợi
                processQueue(null, newToken);
                
                // Gọi lại request gốc
                originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
                return axiosInstance(originalRequest);

            } catch (refreshError) {
                processQueue(refreshError, null);
                axiosInstance.clearAuthToken();
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

export default axiosInstance;