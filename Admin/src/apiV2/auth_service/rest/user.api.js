import axiosInstance from '../../../config/axiosConfig';

// 💡 SỬA: Cập nhật trạng thái
// Gọi sang AUTH SERVICE (Source of Truth) thay vì User Service
// Giả định Gateway route /api/auth/* sẽ forward sang Auth Service
export const updateUserStatus = async (userId, isActive) => {
    try {
        // Gửi { isActive: true/false }
        // Đường dẫn này tùy thuộc vào router bên Auth Service của bạn
        // Ví dụ: PATCH /api/auth/admin/users/:id/status
        const response = await axiosInstance.patch(`/api/users/${userId}/status`, { isActive });
        return response.data;
    } catch (error) {
        throw error;
    }
};

// 3. Tạo Center Manager mới (Gọi sang Auth Service/Admin route)
export const createCenterManager = async (data) => {
    try {
        // data: { name, email, password, phone_number }
        // Backend sẽ tự set role = CENTER_MANAGER
        const response = await axiosInstance.post("/api/admin/users", {
            ...data,
            role: "CENTER_MANAGER" 
        });
        return response.data;
    } catch (error) {
        console.error("Error creating manager:", error);
        throw error;
    }
};

export const ResetManagerPassword = async (userId, newPassword) => {
    try {
        // Gọi sang Admin API riêng biệt
        const response = await axiosInstance.put(`/api/users/${userId}/password`, { 
            newPassword 
        });
        return response.data;
    } catch (error) {
        console.error("Error resetting password for user:", userId, error);
        throw error;
    }
};

/**
 * Gửi yêu cầu đổi mật khẩu đến AuthService.
 * @param {object} passwordData - Gồm { oldPassword, newPassword }
 * @returns {Promise<object>} Response từ server (vd: { success: true, message: "..." })
 */
export const updateMyPassword = async (passwordData) => {
  try {
    // 💡 SỬA LỖI:
    // Gửi thẳng 'passwordData' (chứa cả 3 trường)
    // thay vì bóc tách chỉ 2 trường.
    const response = await axiosInstance.put('/api/users/me/password', passwordData);

    console.log("Password changed successfully:", response.data);
    return response.data;
    
  } catch (error) {
    // Joi sẽ ném lỗi 400, và nó sẽ bị bắt ở đây
    console.error("Error changing password:", error.response?.data || error.message);
    throw error;
  }
};