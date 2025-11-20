import axiosInstance from '../../config/axiosConfig';

export const loginAdmin = async ({ identifier, password, clientId }) => {
  try {
    // 💡 GỬI CLIENT ID CÙNG VỚI TÊN ĐĂNG NHẬP VÀ MẬT KHẨU
    const response = await axiosInstance.post(`/api/auth/login`,
      {
        identifier, 
        password,
        clientId, // 💡 ĐÃ THÊM: Dùng để API Gateway/Auth Service xác định nguồn
      }
    );
    const data = response.data;
    // Lưu Access Token vào bộ nhớ của axiosInstance
    axiosInstance.setAuthToken(data.accessToken);

    console.log("Login successful:", data);
    return data;
  } catch (error) {
    console.error("Error logging in:", error.response?.data || error.message);
    // 💡 Re-throw lỗi để component Login có thể bắt và hiển thị thông báo
    throw error;
  }
};

export const logoutAdmin = async () => {
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