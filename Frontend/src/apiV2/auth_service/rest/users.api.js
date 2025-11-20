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