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

/**
 * 💡 MỚI: Yêu cầu lấy lại mật khẩu (Gửi email - Forgot Flow)
 * Endpoint này map với AuthController.forgotPassword (POST /api/auth/forgot-password)
 * @param {string} email - Email của người dùng
 */
export const forgotPasswordApi = async (email) => {
    try {
        const response = await axiosInstance.post('/api/auth/forgot-password', { email });
        console.log("Forgot password request sent:", response.data);
        return response.data;
    } catch (error) {
        // Backend luôn trả về 200 để bảo mật, nên lỗi ở đây thường là lỗi mạng hoặc 500
        console.error("Error requesting password reset:", error.response?.data || error.message);
        throw error;
    }
};

/**
 * 💡 MỚI: Đặt lại mật khẩu (Từ Link Email - Reset Flow)
 * Endpoint này map với AuthController.resetPassword (POST /api/auth/reset-password)
 */
export const resetPasswordApi = async (token, userId, newPassword) => {
    try {
        const response = await axiosInstance.post('/api/auth/reset-password', {
            token,
            userId,
            newPassword,
            confirmPassword: newPassword 
        });
        return response.data;
    } catch (error) {
        throw error;
    }
};


