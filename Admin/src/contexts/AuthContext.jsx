import React, { createContext, useState, useEffect, useMemo } from "react";
// Import API
import { fetchAdminInfo } from "../apiV2/user_service/rest/user.api.js";
import { logoutAdmin } from "../apiV2/auth_service/auth.api.js";
import { refreshTokenApi } from "../apiV2/auth_service/token.api.js";
import axiosInstance from "../config/axiosConfig";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [admin, setAdmin] = useState(null);
    // Bắt đầu là true để chặn render cho đến khi check xong
    const [loading, setLoading] = useState(true); 

    const initializeAuth = async () => {
        try {
            console.log("[AuthContext] Đang khôi phục phiên đăng nhập...");
            
            // 1. Gọi Refresh Token (Đã có header x-client-id nhờ token.api.js)
            const data = await refreshTokenApi();
            const { accessToken, user: authUser } = data;

            if (accessToken) {
                // 2. Set Token cho Axios Instance chính
                axiosInstance.setAuthToken(accessToken);

                // 3. Lấy thông tin Profile chi tiết (User Service)
                const profileData = await fetchAdminInfo();

                const fullAdmin = {
                    ...authUser,
                    ...profileData,
                    hasPassword: authUser?.hasPassword ?? false
                };
                
                setAdmin(fullAdmin);
                console.log("[AuthContext] Khôi phục thành công.");
            }
        } catch (error) {
            // Không log error quá ồn ào vì F5 khi chưa login là chuyện bình thường
            // console.warn("[AuthContext] Phiên hết hạn hoặc chưa đăng nhập.");
            setAdmin(null);
            axiosInstance.clearAuthToken();
        } finally {
            // Dù thành công hay thất bại cũng phải tắt loading để app render
            setLoading(false);
        }
    };

    // Chạy 1 lần duy nhất khi F5
    useEffect(() => {
        initializeAuth();
    }, []);

    const login = async (authData) => {
        try {
            setLoading(true);
            const { accessToken, user } = authData;
            
            // 1. Set token ngay lập tức
            axiosInstance.setAuthToken(accessToken);
            
            // 2. Lấy profile
            const profileData = await fetchAdminInfo();
            const fullAdmin = { ...user, ...profileData };
            
            setAdmin(fullAdmin);
            return true;
        } catch (e) {
            console.error("[AuthContext] Login error:", e);
            axiosInstance.clearAuthToken();
            setAdmin(null);
            throw e;
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        try {
            await logoutAdmin(); // Gọi API xóa cookie
        } catch (error) {
            console.error("Logout warning:", error);
        } finally {
            // Xóa sạch ở client bất kể API thành công hay không
            axiosInstance.clearAuthToken();
            setAdmin(null);
            // Có thể reload để đảm bảo sạch memory
            // window.location.href = "/login"; 
        }
    };

    // Hàm update thông tin admin thủ công nếu cần
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
            {/* Chỉ render children khi đã check xong auth */}
            {!loading && children}
        </AuthContext.Provider>
    );
};