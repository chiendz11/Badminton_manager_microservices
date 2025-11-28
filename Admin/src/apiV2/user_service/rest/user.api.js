import axiosInstance from "../../../config/axiosConfig";

// Lấy thông tin Admin/Me
export const fetchAdminInfo = async () => {
  try {
    const response = await axiosInstance.get("/api/users/me");
    return response.data;
  } catch (error) {
    console.error("Error fetching user info:", error);
    throw error;
  }
};

// 1. Lấy danh sách Users (Hỗ trợ filter Role, Search, Pagination)
export const getAllUsers = async (params) => {
  try {
    // params: { page, limit, role, search, isActive, sort, ... }
    const response = await axiosInstance.get("/api/users", { params });
    return response.data; 
  } catch (error) {
    console.error("Error fetching users:", error);
    // Trả về object lỗi chuẩn để UI không bị crash
    return { 
        success: false, 
        message: error.response?.data?.message || "Lỗi tải danh sách người dùng." 
    };
  }
};

// 💡 [MỚI] 4. Cập nhật thông tin Profile (Tên, SĐT,...) cho User bất kỳ
// Dành cho Admin chỉnh sửa thông tin người dùng
export const updateUserProfile = async (userId, data) => {
    try {
        // data: { name, phone_number, ... } (Không bao gồm password/email nếu API không hỗ trợ)
        const response = await axiosInstance.patch(`/api/users/${userId}`, data);
        return response.data;
    } catch (error) {
        console.error("Error updating user profile:", error);
        throw error;
    }
};