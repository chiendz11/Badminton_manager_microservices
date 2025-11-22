import React, { createContext, useState, useEffect, useMemo } from "react";
import { fetchUserInfo } from "../apiV2/user_service/rest/users.api.js"; // Chú ý path import user.api
import { logoutUser } from "../apiV2/auth_service/auth.api.js";
import { refreshTokenApi } from "../apiV2/auth_service/token.api.js";
import axiosInstance from "../config/axiosConfig";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const initializeAuth = async () => {
        try {
            console.log("[AuthContext User] Khởi động ứng dụng...");

            // 1. Gọi Refresh để lấy lại session
            const data = await refreshTokenApi();
            const { accessToken, user: authUser } = data;

            // 2. Cập nhật axios ngay lập tức
            axiosInstance.setAuthToken(accessToken);

            // 3. Lấy thông tin Profile chi tiết
            const profileData = await fetchUserInfo();

            // 4. Merge User
            const fullUser = {
                ...authUser,
                ...profileData,
                hasPassword: authUser?.hasPassword ?? false
            };
            
            setUser(fullUser);
            console.log("[AuthContext User] Khôi phục phiên thành công.");

        } catch (error) {
            console.warn("[AuthContext User] Không có phiên đăng nhập:", error.message);
            setUser(null);
            axiosInstance.clearAuthToken();
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        initializeAuth();
    }, []);

    // 💡 HÀM LOGIN CHUẨN: Đồng bộ hóa việc set token -> fetch data -> set state
    const login = async (authData) => {
        try {
            setLoading(true);
            const { accessToken, user: baseUser } = authData;
            
            // 1. Set Token cho Axios trước tiên (Quan trọng!)
            axiosInstance.setAuthToken(accessToken);
            
            console.log("[AuthContext User] Token set, fetching profile...");

            // 2. Gọi API lấy profile chi tiết
            // (Nếu API này lỗi, sẽ nhảy xuống catch và không set User -> Tránh lỗi UI thiếu data)
            const profileData = await fetchUserInfo();
            
            const fullUser = { 
                ...baseUser, 
                ...profileData,
                hasPassword: baseUser?.hasPassword ?? false
            };
            
            // 3. Set State User để kích hoạt re-render và chuyển trang
            setUser(fullUser);
            
            return true; // Báo hiệu login thành công
        } catch (e) {
            console.error("[AuthContext User] Login error:", e);
            axiosInstance.clearAuthToken();
            setUser(null);
            throw e; // Ném lỗi để Login.jsx hiển thị thông báo
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
            // window.location.reload(); // Tùy chọn nếu muốn sạch sẽ hoàn toàn
        }
    };

    const refreshUser = async () => {
        if (!user) return;
        try {
            const profileData = await fetchUserInfo();
            setUser(prev => ({ ...prev, ...profileData }));
        } catch (e) { console.error(e); }
    };

    // 💡 Dùng useMemo để tối ưu hiệu năng, tránh re-render các component con không cần thiết
    const contextValue = useMemo(() => ({
        user, 
        setUser, 
        login, 
        logout, 
        loading, 
        refreshUser
    }), [user, loading]);

    return (
        <AuthContext.Provider value={contextValue}>
            {!loading && children}
        </AuthContext.Provider>
    );
};