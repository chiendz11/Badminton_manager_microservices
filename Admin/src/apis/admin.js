// src/api/adminAPI.js
import axiosInstance from '../config/axiosConfig'; // Đường dẫn tới file định nghĩa axiosInstance

/**
 * Lấy CSRF token từ backend và lưu vào localStorage.
 * Hàm này giả định rằng backend của bạn có một endpoint GET /api/csrf-token
 * để cung cấp token.
 */
export async function getCsrfToken() {
  try {
    // Sử dụng axiosInstance để đảm bảo withCredentials được gửi đi
    const response = await axiosInstance.get('/api/csrf-token');
    const csrfToken = response.data.csrfToken;
    if (csrfToken) {
      localStorage.setItem('csrfToken', csrfToken);
      console.log('CSRF token đã được lấy và lưu trữ.');
      return csrfToken;
    } else {
      console.warn('Backend không trả về CSRF token.');
      return null;
    }
  } catch (error) {
    console.error('Lỗi khi lấy CSRF token:', error);
    // Có thể throw lỗi hoặc trả về null tùy thuộc vào cách bạn muốn xử lý
    throw error;
  }
}

export async function loginAdmin(credentials) {
  try {
    const response = await axiosInstance.post('/api/admin/login', credentials);

    // Kiểm tra xem đăng nhập có thành công không trước khi lấy CSRF token
    // Giả sử response.data có một trường 'success' hoặc một điều kiện nào đó để xác định thành công
    if (response.data.success) { // Thay 'success' bằng trường báo hiệu thành công của bạn
      await getCsrfToken(); // Gọi hàm lấy CSRF token sau khi đăng nhập thành công
    } else {
      console.warn('Đăng nhập admin không thành công, không lấy CSRF token mới.');
    }

    return response.data;
  } catch (error) {
    console.error('Error during admin login:', error);
    // Trả về dữ liệu lỗi từ response hoặc lỗi mặc định
    throw error.response?.data || { success: false, message: 'Lỗi khi đăng nhập admin' };
  }
}

// Lưu ý: Nếu bạn muốn getCsrfToken có thể được gọi từ bên ngoài module này
// thì vẫn giữ export cho nó. Nếu không, có thể biến nó thành một hàm private.