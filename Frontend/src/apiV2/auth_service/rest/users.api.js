import axiosInstance from "../../../config/axiosConfig";

export const registerUser = async (userData) => {
  try {
    // Lưu ý: Nếu bạn đã chuyển route register vào auth_service, 
    // endpoint có thể cần đổi thành "/api/auth/users" tùy cấu hình Gateway
    const response = await axiosInstance.post("/api/users", userData); 
    console.log("Đăng ký thành công:", response.data);
    return response.data;
  } catch (error) {
    console.error("Lỗi đăng ký:", error.response?.data || error.message);
    throw error;
  }
};

/**
 * Gửi yêu cầu đổi mật khẩu đến AuthService (Khi user đang đăng nhập)
 * @param {object} passwordData - Gồm { oldPassword, newPassword }
 * @returns {Promise<object>} Response từ server
 */
export const updateUserPassword = async (passwordData) => {
  try {
    const response = await axiosInstance.put('/api/users/me/password', passwordData);
    console.log("Password changed successfully:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error changing password:", error.response?.data || error.message);
    throw error;
  }
};

