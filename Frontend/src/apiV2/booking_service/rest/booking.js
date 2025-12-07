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

export const getBookingStatusFromBookingId = async (bookingId) => {
  try {
    const response = await axiosInstance.get(`/api/booking/${bookingId}/status`);
    return response.data;
  } catch (error) {
    console.error("Error fetching booking status:", error.response?.data || error.message);
    throw error;
  }
}

export const confirmBookingToDB = async ({ centerId, bookDate, userName, courtBookingDetails}) => {
  try {
    const response = await axiosInstance.post("/api/booking/pending/pendingBookingToDB", {
      centerId,
      userName,
      courtBookingDetails,
      bookDate,
    });
    return response.data;
  } catch (error) {
    console.error("Error confirming booking to DB:", error.response?.data || error.message);
    throw error;
  }
};

// --- CÁC HÀM MỚI THÊM VÀO ---

/**
 * Gọi API tạo link thanh toán PayOS
 * @param {Object} payload - { bookingId, amount, description, returnUrl, cancelUrl }
 */
export const createPayOSPayment = async ({ bookingId, amount, description, returnUrl, cancelUrl }) => {
  try {
    // Lưu ý: Đảm bảo đường dẫn API khớp với Controller bên NestJS của bạn
    // Ví dụ: BookingController hoặc PaymentController
    const response = await axiosInstance.post("api/booking/payment/create-link", {
      bookingId,
      amount,
      description,
      returnUrl,
      cancelUrl
    });
    // Backend trả về: { bin, accountNumber, amount, description, orderCode, qrCode, ... }
    return response.data;
  } catch (error) {
    console.error("Error creating PayOS payment:", error.response?.data || error.message);
    throw error;
  }
};

/**
 * Gọi API kiểm tra trạng thái đơn hàng (Polling)
 * @param {string|number} orderCode - Mã đơn hàng PayOS trả về
 */
export const checkPaymentStatus = async (orderCode) => {
  try {
    const response = await axiosInstance.get(`/api/payment/status/${orderCode}`);
    // Backend trả về: { status: "PAID" | "PENDING" | "CANCELLED" ... }
    return response.data;
  } catch (error) {
    // Không throw error để tránh ngắt quá trình polling, chỉ log warning
    console.warn("Polling payment status failed:", error.message);
    return { status: "PENDING" };
  }
};


// Hàm hủy booking (nếu chưa có)
export const cancelBookingAPI = async (bookingId) => {
    // Giả sử bạn có endpoint update status
    // return axiosInstance.patch(`/api/booking/${bookingId}`, { status: 'cancelled' });
    // Hoặc endpoint delete nếu xóa cứng
     return axiosInstance.delete(`/api/booking/${bookingId}`);
}

