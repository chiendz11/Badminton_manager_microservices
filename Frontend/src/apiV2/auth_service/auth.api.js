import axiosInstance from "../../config/axiosConfig";

// Đăng nhập người dùng
export const loginUser = async ({ identifier, password, clientId }) => {
  try {
    // Gửi request đăng nhập
    const response = await axiosInstance.post('/api/auth/login', {
      identifier,
      password,
      // 💡 GỬI CLIENT ID LÊN BACKEND
      clientId 
    });
    const data = response.data;
    // Lưu token vào bộ nhớ của axiosInstance
    axiosInstance.setAuthToken(data.accessToken);

    console.log("Login successful:", data);
    return data;
  } catch (error) {
    console.error("Error logging in:", error.response?.data || error.message);
    throw error;
  }
};

export const logoutUser = async () => {
  try {
    await axiosInstance.delete('/api/auth/logout');
    axiosInstance.clearAuthToken();
    console.log("Logout successful");
  } catch (error) {
    console.error("Error logging out:", error.response?.data || error.message);
    axiosInstance.clearAuthToken();
    throw error;
  }
};

// 💡 ==============================================
// 💡 HÀM MỚI: ĐỔI MẬT KHẨU
// 💡 ==============================================

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
    const response = await axiosInstance.put('/api/auth/change-password', passwordData);

    console.log("Password changed successfully:", response.data);
    return response.data;
    
  } catch (error) {
    // Joi sẽ ném lỗi 400, và nó sẽ bị bắt ở đây
    console.error("Error changing password:", error.response?.data || error.message);
    throw error;
  }
};

