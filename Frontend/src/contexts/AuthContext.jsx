import React, { createContext, useState, useEffect } from "react";
import { fetchUserInfo, logoutUser } from "../apis/users";

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
      if (data.success) {
        setUser(data.user);
      } else {
        // Nếu không lấy được user (ví dụ: cookie không hợp lệ), đăng xuất
        await logoutUser();
        setUser(null);
      }
    } catch (error) {
      console.error("Error in AuthContext fetching user info:", error);
      // Nếu có lỗi, đăng xuất user
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