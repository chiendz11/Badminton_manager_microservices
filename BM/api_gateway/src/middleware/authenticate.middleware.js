// api_gateway/src/middleware/authMiddleware.js

import jwt from 'jsonwebtoken';
// 💡 Lấy khóa bí mật (SECRET_KEY) từ file config
import { JWT_SECRET } from '../configs/env.config.js';
import { mapAuthRoleToGateway } from '../configs/role_mapping.config.js'

// Hàm này giả định rằng JWT_ACCESS_SECRET được thiết lập
// và là khóa mà Auth Service đã sử dụng để ký Access Token.
export const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: "Access token required." });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: "Access token is missing." });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        
        const authRole = decoded.role; // ví dụ: 'USER'
        const gatewayRole = mapAuthRoleToGateway(authRole); 
        console.log(`[Gateway] Mapped role from AuthService: ${authRole} -> Gateway role: ${gatewayRole}`);
        
        if (!gatewayRole) {
            return res.status(403).json({ message: "Forbidden: Invalid user role defined." });
        }

        // ✅ Thêm username vào req.user
        req.user = {
            id: decoded.userId,
            role: gatewayRole,
            username: decoded.username // fallback nếu JWT không có username
        };

        next();

    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({
                message: "Access token expired. Please refresh the token.",
                errorCode: "TOKEN_EXPIRED"
            });
        }

        return res.status(403).json({
            message: "Not authorized. Invalid access token.",
            errorCode: "TOKEN_INVALID"
        });
    }
};
