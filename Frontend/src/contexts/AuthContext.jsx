import React, { createContext, useState, useEffect, useMemo } from "react";
// Đảm bảo đường dẫn import chính xác
import { fetchUserInfo } from "../apiV2/user_service/rest/users.api.js"; 
import { logoutUser } from "../apiV2/auth_service/auth.api.js";
import { refreshTokenApi } from "../apiV2/auth_service/token.api.js";
import axiosInstance from "../config/axiosConfig";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const initializeAuth = async () => {
        try {
            console.log("[AuthContext] Đang khởi tạo phiên đăng nhập...");

            // 1. Gọi Refresh Token trước tiên (token.api.js đã có header x-client-id)
            // Request này sẽ gửi cookie 'user_refresh_token' lên server
            const data = await refreshTokenApi();
            const { accessToken, user: authUser } = data;

            if (accessToken) {
                // 2. Set Token cho Axios Instance chính
                axiosInstance.setAuthToken(accessToken);

                // 3. Gọi API lấy profile chi tiết (User Service)
                // Lúc này request đã có Authorization Header nhờ bước 2
                const profileData = await fetchUserInfo();

                const fullUser = {
                    ...authUser,
                    ...profileData,
                    hasPassword: authUser?.hasPassword ?? false
                };
                
                setUser(fullUser);
                console.log("[AuthContext] Khôi phục phiên thành công:", fullUser.username);
            }

        } catch (error) {
            // Xử lý lỗi im lặng cho người dùng khách
            if (error.response && (error.response.status === 401 || error.response.status === 403)) {
                console.log("[AuthContext] Trạng thái: Khách (Chưa đăng nhập).");
            } else {
                console.warn("[AuthContext] Không thể khôi phục phiên:", error.message);
            }
            
            // Dọn dẹp state
            setUser(null);
            axiosInstance.clearAuthToken();
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        initializeAuth();
    }, []);

    const login = async (authData) => {
        try {
            setLoading(true);
            const { accessToken, user: baseUser } = authData;
            
            // 1. Set Token ngay lập tức
            axiosInstance.setAuthToken(accessToken);
            console.log("[AuthContext] Token set, fetching profile...");

            // 2. Gọi API lấy profile
            const profileData = await fetchUserInfo();
            
            const fullUser = { 
                ...baseUser, 
                ...profileData,
                hasPassword: baseUser?.hasPassword ?? false
            };
            
            setUser(fullUser);
            return true;
        } catch (e) {
            console.error("[AuthContext] Login error:", e);
            axiosInstance.clearAuthToken();
            setUser(null);
            throw e; 
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        try {
            await logoutUser(); // Gọi API xóa cookie
        } catch (error) {
            console.error("Logout warning:", error.message);
        } finally {
            axiosInstance.clearAuthToken();
            setUser(null);
            // window.location.reload(); 
        }
    };

    const refreshUser = async () => {
        if (!user) return;
        try {
            const profileData = await fetchUserInfo();
            setUser(prev => ({ ...prev, ...profileData }));
        } catch (e) { console.error("Refresh user info failed:", e); }
    };

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