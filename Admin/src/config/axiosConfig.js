import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

const axiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Cho phép gửi cookie cùng với request
});

// Interceptor để thêm CSRF token vào header cho các request POST/PUT/DELETE
axiosInstance.interceptors.request.use(
  (config) => {
    // Chỉ thêm CSRF token cho các phương thức cần thiết (POST, PUT, DELETE, PATCH)
    // PATCH cũng là một phương thức thay đổi dữ liệu, thường cần CSRF.
    if (['post', 'put', 'delete', 'patch'].includes(config.method.toLowerCase())) {
      const csrfToken = localStorage.getItem('csrfToken'); // Lấy CSRF token từ localStorage
      if (csrfToken) {
        config.headers['X-CSRF-Token'] = csrfToken; // Thêm vào header
      } else {
        // Cảnh báo nếu token không tồn tại, nhưng vẫn cho phép request đi tiếp.
        // Tùy thuộc vào logic backend, request có thể bị từ chối nếu thiếu token.
        console.warn('CSRF token không tồn tại trong localStorage, request có thể bị từ chối bởi server.');
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default axiosInstance;