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


