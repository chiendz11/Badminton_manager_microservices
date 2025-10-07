import axiosInstance from "../config/axiosConfig"; // Đảm bảo đường dẫn đúng tới file axiosConfig.js

export const getCourtsByCenter = async (centerId) => {
  try {
    const response = await axiosInstance.get("/api/centers/getCourts", {
      params: { centerId }
    });
    // Giả sử API trả về { success: true, data: [...] }
    return response.data.data; // Trả về mảng sân
  } catch (error) {
    console.error("Lỗi khi lấy danh sách sân:", error.response?.data || error.message);
    throw error;
  }
};


export const getPriceForTimeslot = async ({ centerId, date, timeslot }) => {
  try {
    const response = await axiosInstance.post("/api/centers/slotPrice", { centerId, date, timeslot });
    return response.data;
  } catch (error) {
    console.error("Error getting timeslot price:", error.response?.data || error.message);
    throw error;
  }
};

export const getCenterPricing = async (centerId) => {
  try {
    const response = await axiosInstance.get("/api/centers/pricing", {
      params: { centerId }
    });
    // Giả sử API trả về { success: true, pricing: { weekday: [...], weekend: [...] } }
    return response.data.pricing;
  } catch (error) {
    console.error("Error fetching center pricing:", error.response?.data || error.message);
    throw error;
  }
};

export const getCenterInfoById = async (centerId) => {
  try {
    const response = await axiosInstance.get("/api/centers/infoing", {
      params: { centerId }
    });
    // Giả sử API trả về { success: true, ... }
    return response.data;
  } catch (error) {
    console.error("Error fetching center info:", error.response?.data || error.message);
    throw error;
  }
};

export const getAllCenters = async () => {
  try {
    const response = await axiosInstance.get("/api/centers/getAllCenters");
    return response.data.data; // Mảng các trung tâm
  } catch (error) {
    console.error("Error fetching centers:", error.response?.data || error.message);
    throw error;
  }
};

/**
 * Lấy danh sách kho hàng theo trung tâm và danh mục
 * @param {{ centerId?: string, category?: string }} params
 */
export const getInventoryList = async (params = {}) => {
  try {
    const response = await axiosInstance.get("/api/inventories/list", { params });
    // Giả sử API trả về { success: true, data: [...] }
    return response.data.data; // Trả về mảng sản phẩm
  } catch (error) {
    console.error("Lỗi khi lấy danh sách kho hàng:", error.response?.data || error.message);
    throw error;
  }
};

/**
 * Tạo hóa đơn mới
 * @param {Object} payload - { invoiceNumber, centerId, items, totalAmount, paymentMethod, customer }
 * @returns {Promise<Object>} - Dữ liệu hóa đơn được tạo
 */
export const createSellHistory = async (payload) => {
  try {
    const response = await axiosInstance.post("/api/sell-histories", payload);
    // Giả sử API trả về { success: true, data: {...} }
    return response.data.data; // Trả về dữ liệu hóa đơn
  } catch (error) {
    console.error("Lỗi khi tạo hóa đơn:", error.response?.data || error.message);
    throw error;
  }
};