import React, { createContext, useState, useEffect, useMemo } from "react";
// Đảm bảo đường dẫn import chính xác với cấu trúc folder của bạn
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

            // 1. Gọi Refresh để lấy lại session (Cookie -> Access Token)
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
            console.log("[AuthContext] Khôi phục phiên thành công:", fullUser.username);

        } catch (error) {
            // 💡 BEST PRACTICE: Xử lý lỗi im lặng cho người dùng khách
            // Nếu lỗi là 401 hoặc 403, nghĩa là Token hết hạn hoặc không có -> Là Khách
            if (error.response && (error.response.status === 401 || error.response.status === 403)) {
                console.log("[AuthContext] Trạng thái: Khách (Chưa đăng nhập).");
            } else {
                // Chỉ log warning nếu là lỗi mạng hoặc lỗi Server (500)
                console.warn("[AuthContext] Không thể khôi phục phiên (Lỗi mạng/Server):", error.message);
            }
            
            // Dọn dẹp state để đảm bảo sạch sẽ
            setUser(null);
            axiosInstance.clearAuthToken();
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        initializeAuth();
    }, []);

    // 💡 HÀM LOGIN CHUẨN
    const login = async (authData) => {
        try {
            setLoading(true);
            const { accessToken, user: baseUser } = authData;
            
            // 1. Set Token cho Axios trước tiên
            axiosInstance.setAuthToken(accessToken);
            console.log("[AuthContext] Token set, fetching profile...");

            // 2. Gọi API lấy profile chi tiết
            const profileData = await fetchUserInfo();
            
            const fullUser = { 
                ...baseUser, 
                ...profileData,
                hasPassword: baseUser?.hasPassword ?? false
            };
            
            // 3. Set State
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
            await logoutUser();
        } catch (error) {
            console.error("Logout warning:", error.message);
        } finally {
            axiosInstance.clearAuthToken();
            setUser(null);
            // window.location.reload(); // Uncomment nếu muốn reload trang để clear cache
        }
    };

    const refreshUser = async () => {
        if (!user) return;
        try {
            const profileData = await fetchUserInfo();
            setUser(prev => ({ ...prev, ...profileData }));
        } catch (e) { 
            console.error("Refresh user info failed:", e); 
        }
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