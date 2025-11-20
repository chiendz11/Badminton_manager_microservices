// 💡 ĐỊNH NGHĨA VAI TRÒ GỐC TỪ AUTH SERVICE (Source of Truth)
// (Khớp với 'enum Role' trong Prisma)
export const AUTH_ROLES = {
    USER: 'USER',
    CENTER_MANAGER: 'CENTER_MANAGER',
    SUPER_ADMIN: 'SUPER_ADMIN',
};

// 💡 ĐỊNH NGHĨA VAI TRÒ SỬ DỤNG TRONG LOGIC GATEWAY (Target)
// (Chúng ta sẽ dùng chữ thường cho nhất quán)
export const GATEWAY_ROLES = {
    USER: 'user',
    CENTER_MANAGER: 'center_manager',
    SUPER_ADMIN: 'super_admin',
};

// 💡 BẢNG ÁNH XẠ: MAPPER (ĐÃ CẬP NHẬT)
export const ROLE_MAPPER = {
    [AUTH_ROLES.USER]: GATEWAY_ROLES.USER,
    [AUTH_ROLES.CENTER_MANAGER]: GATEWAY_ROLES.CENTER_MANAGER,
    [AUTH_ROLES.SUPER_ADMIN]: GATEWAY_ROLES.SUPER_ADMIN,
};

/**
 * Hàm ánh xạ vai trò từ Auth Service sang vai trò Gateway hiểu.
 * @param {string} authRole - Vai trò từ JWT (ví dụ: 'USER').
 * @returns {string | null} - Vai trò Gateway chuẩn hóa (ví dụ: 'user'), hoặc null nếu không hợp lệ.
 */
export const mapAuthRoleToGateway = (authRole) => {
    return ROLE_MAPPER[authRole] || null;
};