import axios from "axios";
// Đảm bảo file token.api.js này KHÔNG import axiosInstance từ đây (tránh circular dependency)
import { refreshTokenApi } from "../apiV2/auth_service/token.api.js";

// Fallback URL nếu biến môi trường chưa load kịp
const API_URL = import.meta.env.VITE_API_GATEWAY_URL || "http://localhost";
const CLIENT_ID = import.meta.env.VITE_CLIENT_ID;

console.log("Axios Base URL:", API_URL);

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
        if (CLIENT_ID) {
            config.headers['x-client-id'] = CLIENT_ID;
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

        // 💡 BEST PRACTICE: Whitelist (Danh sách API Công khai)
        // Những API này KHÔNG BAO GIỜ được kích hoạt cơ chế Auto-Refresh Token
        // Vì nếu nó lỗi (401/400), nghĩa là sai logic/input, không phải do hết phiên.
        const PUBLIC_APIS = [
            '/api/auth/login',           // Đăng nhập sai pass -> 401 -> Báo lỗi đỏ
            '/api/auth/refresh-token',   // Refresh lỗi -> 401 -> Logout
            '/api/auth/forgot-password', // Quên mật khẩu
            '/api/auth/reset-password',  // Đặt lại mật khẩu (Token reset sai) -> 401 -> Báo lỗi đỏ
            '/api/auth/verify-user'      // Xác thực email
        ];

        // Kiểm tra xem URL hiện tại có nằm trong whitelist không
        const isPublicApi = PUBLIC_APIS.some(api => originalRequest.url.includes(api));
        
        // Nếu là API công khai mà bị lỗi -> Trả về lỗi ngay lập tức cho Component
        if (isPublicApi) {
            return Promise.reject(error);
        }

        // --- Logic Refresh Token cho các API Private ---
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
                
                // Xử lý hàng đợi các request đang chờ
                processQueue(null, newToken);
                
                // Gọi lại request hiện tại với token mới
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                return axiosInstance(originalRequest);

            } catch (refreshError) {
                processQueue(refreshError, null);
                setAccessToken(null);
                
                // Lưu ý: Không redirect window.location ở đây để tránh UX xấu
                // AuthContext sẽ tự động nhận biết state user null
                
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