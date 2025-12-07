import axiosInstance from "../../../config/axiosConfig";

// Cách viết mới: Nhận vào 1 object params chứa tất cả (userId, page, limit, status, search...)
export const getBookingHistory = async (userId, params) => {
  try {
    const response = await axiosInstance.get(`/api/user/${userId}/booking-history`, {
      params: params // Axios sẽ tự chuyển object này thành ?page=1&limit=10...
    });
    return response.data;
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
};

