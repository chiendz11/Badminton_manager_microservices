// api_gateway/src/middleware/authorize.js

/**
 * Middleware phân quyền dựa trên vai trò (RBAC)
 * @param {Array<string>} allowedRoles - Mảng các vai trò được phép (ví dụ: ['admin', 'manager'])
 */
export const authorize = (allowedRoles) => {
    return (req, res, next) => {
        // 💡 Kiểm tra xem authenticateJWT đã chạy chưa và có gán req.user không
        const userRole = req.user?.role; 

        if (!userRole) {
            // Trường hợp này không nên xảy ra nếu authenticateJWT chạy trước đó
            return res.status(500).json({ message: "Authorization failed: User role not found." });
        }

        // Kiểm tra xem vai trò của người dùng có nằm trong danh sách được phép không
        if (allowedRoles.includes(userRole)) {
            // Cho phép đi tiếp đến Proxy
            next();
        } else {
            // Từ chối nếu không đủ quyền
            res.status(403).json({ 
                message: "Access denied. Insufficient permissions for this resource.",
                requiredRoles: allowedRoles 
            });
        }
    };
};