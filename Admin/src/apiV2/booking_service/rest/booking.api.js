    import axiosInstance from "../../../config/axiosConfig";
    
    // --- CÁC HÀM CŨ (GIỮ NGUYÊN) ---
    
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