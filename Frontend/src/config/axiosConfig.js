import axios from "axios";

const API_URL = import.meta.env.API_GATEWAY_URL || "http://localhost:8080";

// 🔑 BIẾN LƯU TRỮ TRONG BỘ NHỚ (IN-MEMORY)
let accessToken = null; 

let isRefreshing = false;
let refreshSubscribers = [];

// Hàm cập nhật token trong bộ nhớ
function setAccessToken(token) {
  accessToken = token;
}

// Hàm đăng ký subscriber khi có nhiều request cùng chờ refresh
function subscribeTokenRefresh(cb) {
  refreshSubscribers.push(cb);
}

function onRefreshed(newToken) {
  refreshSubscribers.forEach(cb => cb(newToken));
  refreshSubscribers = [];
}

const axiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Gửi cookie (Refresh Token)
});

// ----------------------
// Request Interceptor
// ----------------------
axiosInstance.interceptors.request.use(
  (config) => {
    // ⚠️ LẤY TOKEN TRỰC TIẾP TỪ BIẾN BỘ NHỚ
    if (accessToken) { 
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ----------------------
// Response Interceptor
// ----------------------
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Kiểm tra lỗi 401 và chưa retry
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Nếu đang refresh thì chờ token mới
        return new Promise((resolve) => {
          subscribeTokenRefresh((newToken) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            resolve(axiosInstance(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Gọi API refresh token (Refresh Token phải được gửi qua Cookie)
        const res = await axios.post(
          `${API_URL}/api/auth/tokens`, // Thêm /refresh để chuẩn RESTful hơn
          {},
          { withCredentials: true }
        );

        const newToken = res.data.accessToken;
        // 🔑 LƯU TOKEN MỚI VÀO BỘ NHỚ
        setAccessToken(newToken); 

        // Cập nhật Authorization header cho các request đang chờ
        onRefreshed(newToken);

        // Retry lại request gốc
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return axiosInstance(originalRequest);

      } catch (err) {
        console.error("Refresh token failed", err);
        // THẤT BẠI: Refresh Token có vấn đề (hết hạn, bị thu hồi)
        
        // ⚠️ Xóa token cũ và chuyển hướng đăng nhập
        setAccessToken(null); 
        window.location.href = '/login'; // Chuyển hướng về trang đăng nhập
        
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// ----------------------
// HÀM PUBLIC ĐỂ QUẢN LÝ TOKEN TỪ BÊN NGOÀI
// ----------------------
// Hàm này được gọi sau khi đăng nhập thành công
axiosInstance.setAuthToken = (token) => {
    setAccessToken(token);
};

// Hàm này được gọi khi đăng xuất
axiosInstance.clearAuthToken = () => {
    setAccessToken(null);
    // Lưu ý: Nếu có session/token trong localStorage/cookie, cần xử lý ở Auth Service
};

export default axiosInstance;