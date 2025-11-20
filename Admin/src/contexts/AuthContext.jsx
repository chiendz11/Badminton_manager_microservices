import React, { createContext, useState, useEffect } from "react";
import { fetchAdminInfo } from "../apis_v2/user_service/user.api.js";
import { logoutAdmin } from "../apis_v2/auth_serivce/auth.api.js";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
        const [admin, setAdmin] = useState(null);
        const [loading, setLoading] = useState(true); // Thêm trạng thái loading

        // Hàm để lấy thông tin user
        const getAdmin = async () => {
                try {
                        setLoading(true);
                        const data = await fetchAdminInfo();
                        console.log("[AuthContext] Kết quả fetch user:", data);
                        if (data) {
                                // Trạng thái thành công, có dữ liệu user
                                setAdmin(data);
                                console.log("[AuthContext] Admin đã được đặt:", data);
                        } else {
                                setAdmin(null);
                                console.log("[AuthContext] Không có admin, đặt admin thành null.");
                        }
                } catch (error) {
                        // Xử lý lỗi mạng hoặc lỗi Server 500 (chưa được Interceptor xử lý)
                        console.error("Error in AuthContext fetching admin info (Network/Server Error):", error);

                        // Nếu có lỗi nghiêm trọng, ta cố gắng logout để xóa mọi token/cookie cũ đề phòng
                        await logoutAdmin();
                        setAdmin(null);
                } finally {
                        setLoading(false);
                }
        };

        // Khi ứng dụng khởi chạy, gọi API lấy thông tin user từ cookie
        useEffect(() => {
                getAdmin();
        }, []);

        const login = (adminData) => {
                setAdmin(adminData);
        };

        const logout = async () => {
                try {
                        await logoutAdmin(); // Gọi API logout để xóa cookie trên server
                        setAdmin(null);
                } catch (error) {
                        console.error("Logout error:", error);
                        setAdmin(null); // Đảm bảo admin được xóa ngay cả khi API logout thất bại
                }
        };

        // Hàm để cập nhật thông tin user sau khi chỉnh sửa profile
        const refreshAdmin = async () => {
                await getAdmin();
        };

        return (
                <AuthContext.Provider value={{ admin, setAdmin, login, logout, loading, refreshAdmin }}>
                        {children}
                </AuthContext.Provider>
        );
};
