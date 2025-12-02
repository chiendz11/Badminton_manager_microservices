// src/apis/news.js
import axiosInstance from "../../../config/axiosConfig.js";

export const getNews = async () => {
  try {
    const response = await axiosInstance.get("/api/news/");
    return response.data; // Giả sử response.data có dạng: { success: true, news: [...] }
  } catch (error) {
    console.error("Error fetching news:", error.response?.data || error.message);
    throw error;
  }
};