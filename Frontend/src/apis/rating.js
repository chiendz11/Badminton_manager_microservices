import axiosInstance from "../config/axiosConfig.js";

export const getCommentsForCenter = async (centerId) => {
  try {
    const response = await axiosInstance.get("/api/ratings/get-ratings-for-center", {
      params: { centerId }, // Sử dụng query parameters đúng cách
    });
    return response.data; // Giả sử API trả về { reviews: [...] }
  } catch (error) {
    throw error.response?.data?.message || error.message;
  }
};