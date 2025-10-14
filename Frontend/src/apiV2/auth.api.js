import axiosInstance from "../config/axiosConfig";

// Đăng ký người dùng
export const registerUser = async (userData) => {
  try {
    const response = await axiosInstance.post("/api/auth/users", userData);
    console.log("Đăng ký thành công:", response.data);
    return response.data;
  } catch (error) {
    console.error("Lỗi đăng ký:", error.response?.data || error.message);
    throw error;
  }
};


// Đăng nhập người dùng
export const loginUser = async ({ identifier, password }) => {
  try {
    // Gửi request đăng nhập trước
    const response = await axiosInstance.post('/api/auth/sessions', {
      identifier,
      password
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
    await axiosInstance.delete('/api/auth/sessions');
    axiosInstance.clearAuthToken();
    console.log("Logout successful");
  } catch (error) {
    console.error("Error logging out:", error.response?.data || error.message);
    axiosInstance.clearAuthToken();
    throw error;
  }
};