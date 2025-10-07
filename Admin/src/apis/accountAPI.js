import axiosInstance from "../config/axiosConfig"; // Đảm bảo đường dẫn này đúng

export const updateAdminProfileAPI = async (token, data) => {
  try {
    const res = await axiosInstance.patch("api/account/profile", data, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return res.data;
  } catch (error) {
    // Xử lý lỗi tại đây, ví dụ:
    console.error("Lỗi khi cập nhật profile:", error);
    throw error; // Re-throw lỗi để component gọi API có thể xử lý
  }
};