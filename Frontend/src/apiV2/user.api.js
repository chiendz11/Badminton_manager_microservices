import axiosInstance from "../config/axiosConfig";

export const fetchUserInfo = async () => {
  try {
    const response = await axiosInstance.get("/api/user/me");
    return response.data;
  } catch (error) {
    console.error("Error fetching user info:", error);
    throw error;
  }
};