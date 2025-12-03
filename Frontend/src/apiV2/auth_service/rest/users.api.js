import axiosInstance from "../../../config/axiosConfig";

export const registerUser = async (userData) => {
  try {
    const response = await axiosInstance.post("/api/users", userData);
    console.log("Đăng ký thành công:", response.data);
    return response.data;
  } catch (error) {
    console.error("Lỗi đăng ký:", error.response?.data || error.message);
    throw error;
  }
};

/**
 * Gửi yêu cầu đổi mật khẩu đến AuthService.
 * @param {object} passwordData - Gồm { oldPassword, newPassword }
 * @returns {Promise<object>} Response từ server (vd: { success: true, message: "..." })
 */
export const updateUserPassword = async (passwordData) => {
  try {
    // 💡 SỬA LỖI:
    // Gửi thẳng 'passwordData' (chứa cả 3 trường)
    // thay vì bóc tách chỉ 2 trường.
    const response = await axiosInstance.put('/api/users/me/password', passwordData);

    console.log("Password changed successfully:", response.data);
    return response.data;
    
  } catch (error) {
    // Joi sẽ ném lỗi 400, và nó sẽ bị bắt ở đây
    console.error("Error changing password:", error.response?.data || error.message);
    throw error;
  }
};