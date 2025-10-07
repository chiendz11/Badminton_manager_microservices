import axiosInstance from "../config/axiosConfig";

export const togglePendingTimeslot = async (payload) => {
  try {
    const response = await axiosInstance.post("/api/booking/pending/toggle", payload);
    return response.data;
  } catch (error) {
    console.error("Error toggling pending timeslot:", error.response?.data || error.message);
    throw error;
  }
};

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

export const getMyPendingTimeslots = async (centerId, date) => {
  try {
    const response = await axiosInstance.get("/api/booking/pending/my-timeslots", {
      params: { centerId, date }
    });
    return response.data.mapping;
  } catch (error) {
    console.error("Error fetching my pending timeslots:", error.response?.data || error.message);
    throw error;
  }
};


export const confirmBookingToDB = async ({ userId, centerId, date, totalAmount, name }) => {
  try {
    const response = await axiosInstance.post("/api/booking/pending/pendingBookingToDB", {
      userId,
      centerId,
      date,
      totalAmount,
      name
    });
    return response.data;
  } catch (error) {
    console.error("Error confirming booking to DB:", error.response?.data || error.message);
    throw error;
  }
};

export const confirmBooking = async ({ userId, centerId, date, totalPrice, paymentImage, note }) => {
  try {
    const response = await axiosInstance.post("/api/booking/pending/bookedBookingInDB", {
      userId,
      centerId,
      date,
      totalAmount: totalPrice,
      paymentImage, 
      note
    });
    return response.data;
  } catch (error) {
    console.error("Error confirming booking in DB:", error.response?.data || error.message);
    throw error;
  }
};

export const checkPendingExists = async ({ userId, centerId }) => {
  try {
    const response = await axiosInstance.get("/api/booking/pending/exists", {
      params: { userId, centerId }
    });
    return response.data;
  } catch (error) {
    console.error("Error checking pending booking existence:", error.response?.data || error.message);
    throw error;
  }
};

export const clearAllPendingBookings = async ({ userId, centerId }) => {
  try {
    const response = await axiosInstance.post("/api/booking/pending/clear-all", { userId, centerId });
    return response.data;
  } catch (error) {
    console.error("Error clearing all pending bookings:", error.response?.data || error.message);
    throw error;
  }
};

export const cancelBooking = async () => {
  try {
    const response = await axiosInstance.post("/api/booking/cancel-booking");
    return response.data;
  } catch (error) {
    console.error("Error canceling booking:", error.response?.data || error.message);
    throw error;
  }
};

export const getPopularTimeSlot = async () => {
  try {
    const response = await axiosInstance.get('/api/booking/popular-times');
    if (response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Lỗi khi lấy dữ liệu.');
  } catch (error) {
    console.error('Error in getPopularTimeSlot:', error);
    throw error;
  }
};

export const getBookingHistory = async (userId, page = 1, limit = 30) => {
  try {
    const response = await axiosInstance.get("/api/booking/get-booking-history", {
      params: {
        userId, // Truyền userId để BE biết lấy lịch sử của user nào
        page,   // Trang hiện tại
        limit,  // Số bản ghi mỗi trang
      },
    });

    console.log("API Response:", response);

    // Kiểm tra phản hồi từ server
    if (response.data && response.data.bookingHistory) {
      return response.data; // Trả về dữ liệu phân trang: { history, total, page, limit, totalPages }
    }

    throw new Error(response.data?.message || "API trả về nhưng không có dữ liệu lịch sử.");
  } catch (error) {
    console.error("Error in getBookingHistory:", error?.response?.data || error.message);
    throw error;
  }
};

export const deleteBooking = async (bookingId) => {
  try {
    const response = await axiosInstance.post("/api/booking/delete-booking", { bookingId });
    if (response.data.success) {
      return response.data;
    }
    throw new Error(response.data.message || 'Lỗi khi xóa booking.');
  } catch (error) {
    console.error("Error in deleteBooking:", error.response?.data || error.message);
    throw error;
  }
};