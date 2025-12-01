import axiosInstancefrom from "../../../config/axiosConfig";

export const getPendingMapping = async (centerId, date) => {
  try {
    const response = await axiosInstance.get("/api/booking/pending/mapping", {
      params: { centerId, date }
    });
    return response.data.mapping;
  } catch (error) {
    console.error("Error fetching pending mapping:", error.response?.data || error.message);
    throw error;
  }
};

export const confirmBookingToDB = async ({ centerId, date, username, selectedSlots }) => {
  try {
    const response = await axiosInstance.post("/api/booking/pending/pendingBookingToDB", {
      centerId,
      username,
      date,
      selectedSlots
    });
    return response.data;
  } catch (error) {
    console.error("Error confirming booking to DB:", error.response?.data || error.message);
    throw error;
  }
};