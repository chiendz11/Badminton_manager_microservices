export const authorize = (allowedRoles) => {
    return (req, res, next) => {
        // 💡 Kiểm tra xem authenticateJWT đã chạy chưa và có gán req.user không
        const userRole = req.user?.role; 

        // 👇 DEBUG LOG QUAN TRỌNG: Xem role hiện tại và role yêu cầu
        console.log(`[Authorize] Check User Role: '${userRole}' vs Allowed: ${JSON.stringify(allowedRoles)}`);

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