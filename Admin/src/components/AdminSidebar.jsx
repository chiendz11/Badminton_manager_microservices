import React from 'react';
import { NavLink } from 'react-router-dom'; 
// 💡 1. IMPORT FILE CONSTANTS MỚI
import { ROLES } from '../constants/roles.js';

// (CSS giả lập không đổi)
const navLinkStyle = ({ isActive }) => ({
    display: 'block',
    padding: '10px 15px',
    textDecoration: 'none',
    color: isActive ? 'white' : '#333',
    fontWeight: isActive ? 'bold' : '500',
    backgroundColor: isActive ? '#007bff' : 'transparent',
    borderRadius: '5px',
    marginBottom: '5px'
});
const navHeaderStyle = {
    padding: '10px 15px',
    fontSize: '0.8rem',
    color: '#888',
    textTransform: 'uppercase',
    marginTop: '15px'
};

const AdminSidebar = ({ user }) => {
    if (!user) return null;

    // 💡 2. SỬ DỤNG HẰNG SỐ (CONSTANTS)
    const isSuperAdmin = user.role === ROLES.SUPER_ADMIN;
    const isCenterManager = user.role === ROLES.CENTER_MANAGER;

    // (Danh sách 'navItems' đã được đơn giản hóa trong code của bạn, rất tốt)
    const navItems = [
        // Mục 1: CHUNG HOẶC CÓ CẢ HAI
        { to: "/dashboard", label: "Dashboard" },
        { to: "/account", label: "Tài khoản của tôi" },
        { to: "/center-status", label: "Tình trạng sân" },
        { to: "/admin-bill-list", label: "Quản lý Đơn hàng" },

        // Mục 2: CHỈ CENTER MANAGER
        { to: "/shop", label: "Bán hàng (POS)", roles: [ROLES.CENTER_MANAGER] },
        { to: "/report", label: "Báo cáo Doanh thu", roles: [ROLES.CENTER_MANAGER, ROLES.SUPER_ADMIN] }, // Super Admin cũng thấy
        { to: "/stock", label: "Quản lý Kho", roles: [ROLES.CENTER_MANAGER, ROLES.SUPER_ADMIN] }, // Super Admin cũng thấy
        { to: "/create-fixed-booking", label: "Tạo Lịch cố định", roles: [ROLES.CENTER_MANAGER, ROLES.SUPER_ADMIN] }, // Super Admin cũng thấy

        // Mục 3: CHỈ SUPER ADMIN
        { to: "/users-manage", label: "Quản lý Người dùng", roles: [ROLES.SUPER_ADMIN] },
        { to: "/ratings", label: "Quản lý Đánh giá", roles: [ROLES.SUPER_ADMIN] },
        { to: "/news", label: "Quản lý Tin tức", roles: [ROLES.SUPER_ADMIN] },
    ];

    const allowedItems = navItems.filter(item => 
        !item.roles || item.roles.includes(user.role)
    );

    return (
        <aside style={{ width: '250px', height: '100vh', borderRight: '1px solid #eee', background: '#f9f9f9', position: 'sticky', top: 0 }}>
            <div style={{ padding: '20px', borderBottom: '1px solid #eee' }}>
                <h3 style={{ margin: 0 }}>Admin Panel</h3>
                <p style={{ margin: 0, fontSize: '0.9rem' }}>Chào, {user.username || 'Admin'}</p>
                <span style={{ fontSize: '0.8rem', color: isSuperAdmin ? '#C94B4B' : '#4DA8DA', fontWeight: 'bold' }}>
                    {/* 💡 3. SỬ DỤNG HẰNG SỐ (CONSTANTS) */}
                    Vai trò: {isSuperAdmin ? 'Super Admin' : (isCenterManager ? 'Center Manager' : 'Unknown')}
                </span>
            </div>
            <nav style={{ padding: '10px 10px' }}>
                {allowedItems.map((item, index) => (
                    <NavLink
                        key={index}
                        to={item.to}
                        style={navLinkStyle}
                    >
                        {item.label}
                    </NavLink>
                ))}
            </nav>
        </aside>
    );
};

export default AdminSidebar;