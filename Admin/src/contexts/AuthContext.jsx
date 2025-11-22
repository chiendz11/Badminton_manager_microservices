import React, { createContext, useState, useEffect, useMemo } from "react";
import { fetchAdminInfo } from "../apiV2/user_service/rest/user.api.js";
import { logoutAdmin } from "../apiV2/auth_service/auth.api.js";
import { refreshTokenApi } from "../apiV2/auth_service/token.api.js";
import axiosInstance from "../config/axiosConfig";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [admin, setAdmin] = useState(null);
    const [loading, setLoading] = useState(true);

    const initializeAuth = async () => {
        try {
            console.log("[AuthContext] Khởi động ứng dụng...");
            // 1. Gọi Refresh để lấy lại session
            const data = await refreshTokenApi();
            const { accessToken, user: authUser } = data;

            // 2. Cập nhật axios ngay lập tức
            axiosInstance.setAuthToken(accessToken);

            // 3. Lấy thông tin chi tiết
            const profileData = await fetchAdminInfo();

            const fullAdmin = {
                ...authUser,
                ...profileData,
                hasPassword: authUser?.hasPassword ?? false
            };
            
            setAdmin(fullAdmin);
        } catch (error) {
            console.warn("[AuthContext] Chưa đăng nhập hoặc phiên hết hạn:", error.message);
            setAdmin(null);
            // Quan trọng: Xóa token cũ trong axios nếu có
            axiosInstance.clearAuthToken();
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        initializeAuth();
    }, []);

    // 💡 SỬA HÀM LOGIN: Đảm bảo đồng bộ token trước khi set state
    const login = async (authData) => {
        try {
            setLoading(true);
            const { accessToken, user } = authData;
            
            // 1. CỰC KỲ QUAN TRỌNG: Set token cho axios trước tiên!
            // Để các request sau đó (như fetchAdminInfo) có header Authorization
            axiosInstance.setAuthToken(accessToken);
            
            console.log("[AuthContext] Token set, fetching profile...");

            // 2. Sau đó mới gọi API lấy profile
            const profileData = await fetchAdminInfo();
            
            const fullAdmin = { ...user, ...profileData };
            
            // 3. Cuối cùng mới set state để kích hoạt re-render và chuyển trang
            setAdmin(fullAdmin);
            
            return true; // Trả về true để Login.jsx biết đường redirect
        } catch (e) {
            console.error("[AuthContext] Login error:", e);
            // Nếu lỗi, rollback
            axiosInstance.clearAuthToken();
            setAdmin(null);
            throw e;
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        try {
            await logoutAdmin();
        } catch (error) {
            console.error("Logout error:", error);
        } finally {
            axiosInstance.clearAuthToken();
            setAdmin(null);
            // Optional: Reload trang để xóa sạch state trong memory
            // window.location.reload(); 
        }
    };

    const refreshAdmin = async () => {
        if (!admin) return;
        try {
            const profileData = await fetchAdminInfo();
            setAdmin(prev => ({ ...prev, ...profileData }));
        } catch (e) { console.error(e); }
    };

    const contextValue = useMemo(() => ({
        admin, 
        setAdmin, 
        login, 
        logout, 
        loading, 
        refreshAdmin
    }), [admin, loading]);

    return (
        <AuthContext.Provider value={contextValue}>
            {!loading && children}
        </AuthContext.Provider>
    );
};