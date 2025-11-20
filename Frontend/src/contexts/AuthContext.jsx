import React, { createContext, useState, useEffect } from "react";
import { fetchUserInfo } from "../apiV2/user_service/rest/users.api.js";
import { logoutUser } from "../apiV2/auth_service/auth.api.js";
import { refreshTokenApi } from "../apiV2/auth_service/token.api.js"; 
import axiosInstance from "../config/axiosConfig";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true); 

    const initializeAuth = async () => {
        // Không cần check loading ở đây nữa vì token.api.js đã lo việc Singleton
        try {
            console.log("[AuthContext] Khởi động ứng dụng...");
            
            // 1. Gọi Refresh (Singleton đảm bảo chỉ 1 request đi server)
            const data = await refreshTokenApi();
            const { accessToken, user: authUser } = data;
            
            // 2. Lưu token vào RAM
            axiosInstance.setAuthToken(accessToken);

            // 3. Lấy Profile
            const profileData = await fetchUserInfo();

            // 4. Merge User
            const fullUser = {
                ...authUser,
                ...profileData,
                hasPassword: authUser?.hasPassword ?? false 
            };

            setUser(fullUser);
            console.log("[AuthContext] Đã khôi phục user:", fullUser.email);

        } catch (error) {
            console.log("[AuthContext] Không có phiên đăng nhập.");
            setUser(null);
            axiosInstance.clearAuthToken();
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        initializeAuth();
    }, []);

    // 💡 SỬA LẠI HÀM LOGIN: Nhận data trực tiếp để update UI ngay lập tức
    const login = async (authData) => {
        // authData chính là result trả về từ API loginUser: 
        // { accessToken, refreshToken, user: { id, email, role, hasPassword } }
        
        try {
            setLoading(true);
            
            // 1. Lưu token vào RAM ngay lập tức
            axiosInstance.setAuthToken(authData.accessToken);
            
            // 2. Gọi thêm thông tin Profile (Avatar, Tên...) từ User Service
            const profileData = await fetchUserInfo();
            
            // 3. Hợp nhất dữ liệu (Merge)
            const fullUser = {
                ...authData.user,    // Thông tin từ Auth (quan trọng: hasPassword, role)
                ...profileData,      // Thông tin từ User (avatar, name)
                hasPassword: authData.user?.hasPassword ?? false
            };

            // 4. Cập nhật State -> UI sẽ re-render ngay lập tức
            setUser(fullUser);
            console.log("[AuthContext] Login & Merge thành công:", fullUser);
            
        } catch (error) {
            console.error("[AuthContext] Lỗi lấy profile sau khi login:", error);
            // Nếu lỗi lấy profile, vẫn set user cơ bản để người dùng vào được app
            setUser(authData.user); 
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        try {
            await logoutUser(); 
        } catch (error) {
            console.error("Logout error:", error);
        } finally {
            axiosInstance.clearAuthToken();
            setUser(null);
        }
    };

    const refreshUser = async () => {
         // Chỉ gọi fetch profile, không cần gọi refresh token
         if (!user) return;
         try {
             const profileData = await fetchUserInfo();
             setUser(prev => ({ ...prev, ...profileData }));
         } catch (e) { console.error(e); }
    };

    return (
        <AuthContext.Provider value={{ user, setUser, login, logout, loading, refreshUser }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};