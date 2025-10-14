import React, { createContext, useState, useEffect } from "react";
import { fetchUserInfo } from "../apiV2/user.api.js";
import { logoutUser } from "../apiV2/auth.api.js";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // Thêm trạng thái loading

  // Hàm để lấy thông tin user
  const getUser = async () => {
    try {
      setLoading(true);
      const data = await fetchUserInfo();
      console.log("[AuthContext] Kết quả fetch user:", data);
      
      if (data.success && data.user) {
        // Trạng thái thành công, có dữ liệu user
        setUser(data.user);
      } else {
        // Nếu data.success == false (do lỗi 401/403 đã được Interceptor chuyển đổi)
        // HOẶC data.user không tồn tại.
        // Chúng ta chỉ cần đặt lại user thành null, KHÔNG CẦN gọi logoutUser()
        setUser(null);
      }
    } catch (error) {
      // Xử lý lỗi mạng hoặc lỗi Server 500 (chưa được Interceptor xử lý)
      console.error("Error in AuthContext fetching user info (Network/Server Error):", error);
      
      // Nếu có lỗi nghiêm trọng, ta cố gắng logout để xóa mọi token/cookie cũ đề phòng
      await logoutUser();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // Khi ứng dụng khởi chạy, gọi API lấy thông tin user từ cookie
  useEffect(() => {
    getUser();
  }, []);

  const login = (userData) => {
    setUser(userData);
  };

  const logout = async () => {
    try {
      await logoutUser(); // Gọi API logout để xóa cookie trên server
      setUser(null);
    } catch (error) {
      console.error("Logout error:", error);
      setUser(null); // Đảm bảo user được xóa ngay cả khi API logout thất bại
    }
  };

  // Hàm để cập nhật thông tin user sau khi chỉnh sửa profile
  const refreshUser = async () => {
    await getUser();
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, logout, loading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};
