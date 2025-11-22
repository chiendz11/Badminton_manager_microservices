import axiosInstance from "../../../config/axiosConfig";

export const fetchAdminInfo = async () => {
  try {
    const response = await axiosInstance.get("/api/users/me");
    return response.data;
  } catch (error) {
    console.error("Error fetching user info:", error);
    throw error;
  }
};
