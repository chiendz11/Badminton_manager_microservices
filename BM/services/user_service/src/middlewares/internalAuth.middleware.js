import { INTERNAL_JOB_SECRET } from "../configs/env.config.js";

/**
 * Đây là "Lính gác cổng" của UserService.
 * Nó kiểm tra xem request có phải là từ một service nội bộ
 * (AuthService) hay không bằng cách kiểm tra x-internal-secret.
 */
export const verifyInternalSecret = (req, res, next) => {
    const secret = req.headers['x-internal-secret'];

    if (!secret) {
        return res.status(401).json({ 
            message: "Unauthorized: Missing internal secret." 
        });
    }

    if (secret !== INTERNAL_JOB_SECRET) {
        return res.status(403).json({ 
            message: "Forbidden: Invalid internal secret." 
        });
    }

    // "Mật khẩu" đúng, cho phép request đi tiếp
    next();
};