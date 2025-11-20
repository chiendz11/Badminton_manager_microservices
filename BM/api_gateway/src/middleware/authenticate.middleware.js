// api_gateway/src/middleware/authMiddleware.js

import jwt from 'jsonwebtoken';
// 💡 Lấy khóa bí mật (SECRET_KEY) từ file config
import { JWT_SECRET } from '../configs/env.config.js';
import { mapAuthRoleToGateway } from '../configs/role_mapping.config.js'

// Hàm này giả định rằng JWT_ACCESS_SECRET được thiết lập
// và là khóa mà Auth Service đã sử dụng để ký Access Token.

export const authenticate = (req, res, next) => {
    // 1. Lấy token từ Header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        // Nếu không có header hoặc sai định dạng, từ chối
        return res.status(401).json({ message: "Access token required." });
    }

    // Trích xuất chuỗi token (bỏ "Bearer ")
    const token = authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: "Access token is missing." });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // --- Chuẩn hóa Vai trò tại đây ---
        const authRole = decoded.role; // Giả định JWT chứa vai trò gốc (ví dụ: 'USER')
        const gatewayRole = mapAuthRoleToGateway(authRole); 
        console.log(`[Gateway] Mapped role from AuthService: ${authRole} -> Gateway role: ${gatewayRole}`);
        
        if (!gatewayRole) {
            return res.status(403).json({ message: "Forbidden: Invalid user role defined." });
        }
        // 3. Đính kèm thông tin người dùng vào request
        // Giả định payload JWT chứa { userId, role }
        req.user = {
            id: decoded.userId,
            role: gatewayRole
            // Thêm bất kỳ trường nào khác cần thiết cho service ngược dòng
        };

        // 4. Cho phép request đi tiếp (đến proxy)
        next();

    } catch (err) {
        // 5. Xử lý lỗi JWT (Token hết hạn, chữ ký sai,...)
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({
                message: "Access token expired. Please refresh the token.",
                errorCode: "TOKEN_EXPIRED"
            });
        }

        // Lỗi xác minh chung (chữ ký không hợp lệ)
        return res.status(403).json({
            message: "Not authorized. Invalid access token.",
            errorCode: "TOKEN_INVALID"
        });
    }
};