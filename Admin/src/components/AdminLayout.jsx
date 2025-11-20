import React, { useContext, useEffect } from 'react';
import { AuthContext } from '../contexts/AuthContext.jsx'; // (Sửa đường dẫn nếu cần)
import { useNavigate, Outlet } from 'react-router-dom';
// 💡 1. IMPORT HẰNG SỐ ROLES
import { ROLES } from '../constants/roles.js';

// 💡 ADMIN SIDEBAR ĐÃ BỊ XÓA (THEO YÊU CẦU)
// import AdminSidebar from './AdminSidebar.jsx'; 

/**
 * Đây là component "Gác cổng" CHÍNH cho các trang Quản lý (Admin).
 * 💡 ĐÃ ĐƯỢC CẬP NHẬT:
 * - Bỏ Sidebar
 * - Chỉ còn là "Gác cổng" logic
 */
const AdminLayout = () => {
    // (Sử dụng 'admin' và 'loading' như trong file AuthContext.jsx của bạn)
    const { admin, loading } = useContext(AuthContext);
    const navigate = useNavigate();

    useEffect(() => {
        if (loading) {
            return; // Chờ AuthContext tải xong
        }

        // 1. Kiểm tra Đăng nhập
        if (!admin) {
            navigate('/login', { replace: true }); // Đá về trang login
            return;
        }

        // 2. 💡 KIỂM TRA VAI TRÒ (ROLE) (Dùng hằng số)
        if (admin.role !== ROLES.CENTER_MANAGER && admin.role !== ROLES.SUPER_ADMIN) {
            // Nếu là 'USER' (người dùng thường) cố vào trang admin
            navigate('/login', { replace: true });
        }

    }, [admin, loading, navigate]);

    // Trong khi chờ, hoặc nếu user không hợp lệ, không render gì cả
    if (loading || !admin) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                Đang tải dữ liệu...
            </div>
        );
    }

    // 💡 3. RENDER TRANG CON (KHÔNG CÓ SIDEBAR)
    // Nếu logic ở trên OK (đã login VÀ là Admin/Manager),
    // render trang con (vd: Dashboard, Report...)
    return <Outlet />;
};

export default AdminLayout;