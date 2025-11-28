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

export const adminResetPassword = async (userId, newPassword) => {
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