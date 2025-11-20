import React, { useContext, useEffect } from 'react';
// 💡 1. IMPORT THẬT
// (Giả sử file này ở 'src/components/' và AuthContext ở 'src/contexts/')
import { AuthContext } from '../contexts/AuthContext.jsx'; 
import { useNavigate, Outlet } from 'react-router-dom';

/**
 * Đây là component "Gác cổng" (Gatekeeper/Protected Route).
 * Nó bao bọc tất cả các trang yêu cầu đăng nhập.
 * * Nhiệm vụ của nó là:
 * 1. Kiểm tra xem người dùng đã đăng nhập chưa (if !user).
 * 2. Kiểm tra xem hồ sơ đã hoàn thiện chưa (if !user.phone_number),
 * đây là logic "Lựa chọn 1" của chúng ta.
 */
const ProtectedLayout = () => {
    // 1. Lấy trạng thái user và loading từ AuthContext
    const { user, loading } = useContext(AuthContext);
    const navigate = useNavigate();

    // 2. Chạy logic kiểm tra này mỗi khi 'user' hoặc 'loading' thay đổi
    useEffect(() => {
        // Nếu AuthContext vẫn đang fetch (loading=true),
        // chúng ta chưa vội quyết định, hãy chờ
        if (loading) {
            return;
        }

        // Nếu (sau khi hết loading) VÀ (không có user)
        // -> đá họ về trang chủ
        if (!user) {
            navigate('/', { replace: true });
            return;
        }

        // --- 💡 LOGIC CỐT LÕI (LỰA CHỌN 1) 💡 ---
        // Nếu (đã có user) VÀ (user CHƯA có phone_number)
        if (user && !user.phone_number) {
            // Buộc redirect sang trang "Hoàn thành Hồ sơ"
            // { replace: true } để user không thể nhấn "Back" quay lại
            // các trang được bảo vệ khi chưa hoàn thành.
            console.log("[ProtectedLayout] Phát hiện hồ sơ chưa hoàn thiện (thiếu SĐT). Đang chuyển hướng...");
            navigate('/complete-profile', { replace: true });
        }
        // -----------------------------------------

    }, [user, loading, navigate]); // Phụ thuộc vào các biến này

    // 3. Trong khi đang loading, hiển thị một trình tải đơn giản
    // (Chúng ta không dùng <LoadingSpinner /> để tránh lỗi import)
    if (loading) {
        return (
            <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '100vh', 
                fontSize: '1.2rem', 
                fontFamily: 'sans-serif' 
            }}>
                Đang tải...
            </div>
        );
    }

    // 4. Nếu (không loading) VÀ (có user) VÀ (có phone_number):
    // Logic 'useEffect' ở trên sẽ không redirect.
    // Code sẽ chạy đến đây và render ra trang con (Dashboard, Settings...)
    // thông qua <Outlet />.
    return <Outlet />;
};

export default ProtectedLayout;