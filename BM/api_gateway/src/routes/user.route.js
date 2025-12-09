import { Router } from "express";
import proxy from "express-http-proxy";
// 💡 SỬA: Đảm bảo bạn import đúng GATEWAY_ROLES
import { GATEWAY_ROLES } from "../configs/role_mapping.config.js"; 
import { USER_SERVICE_URL } from "../configs/env.config.js";
import { authenticate } from "../middleware/authenticate.middleware.js";
import { authorize } from "../middleware/authorize.middleware.js";

const router = Router();

// --- Cấu hình Proxy Tái sử dụng ---
const userProxy = proxy(USER_SERVICE_URL, {
    // 1. Loại bỏ prefix /users để gửi path gọn gàng đến UserService
    // Ví dụ: Gateway nhận /users/me/avatar -> Gửi đi /me/avatar
    proxyReqPathResolver: (req) => {
        // Logic này sẽ biến "/api/users/me/avatar" thành "/api/me/avatar" 
        // (Tùy thuộc vào cách UserService của bạn định nghĩa route, 
        // nếu UserService đợi /api/users/me/avatar thì bỏ dòng replace này đi)
        // Nhưng theo code cũ của bạn thì UserService đang đợi /me/avatar nên dòng này ĐÚNG.
        return req.originalUrl.replace("/users", ""); 
    },

    // 2. Chuyển tiếp thông tin người dùng vào header
    proxyReqOptDecorator: (proxyReqOpts, req) => {
        if (req.user) {
            proxyReqOpts.headers['X-User-ID'] = req.user.id;
            proxyReqOpts.headers['X-User-Role'] = req.user.role;
        }
        
        // 💡 QUAN TRỌNG CHO UPLOAD FILE:
        // Đảm bảo Content-Type (multipart/form-data) được giữ nguyên
        // Express-http-proxy thường tự xử lý, nhưng nếu gặp lỗi "Boundary not found"
        // thì cần kiểm tra lại body-parser ở server.js
        return proxyReqOpts;
    },
    
    // 💡 Tăng giới hạn kích thước request cho Proxy (nếu ảnh lớn)
    limit: '10mb' 
});

// -------------------------------------------------------------------
// Định tuyến
// -------------------------------------------------------------------

// 1. GET /api/users (Chỉ SUPER_ADMIN)
router.get("/users",
    authenticate,
    authorize([GATEWAY_ROLES.SUPER_ADMIN]), 
    userProxy
);

router.patch("/users/users-extra",
    authenticate,
    authorize([GATEWAY_ROLES.USER, GATEWAY_ROLES.CENTER_MANAGER, GATEWAY_ROLES.SUPER_ADMIN]),
    userProxy
);

router.get("/users/users-extra",
    authenticate,
    authorize([GATEWAY_ROLES.USER, GATEWAY_ROLES.CENTER_MANAGER, GATEWAY_ROLES.SUPER_ADMIN]),
    userProxy
);

// 2. GET /api/users/me (Xem profile của tôi)
router.get("/users/me",
    authenticate,
    authorize([GATEWAY_ROLES.USER, GATEWAY_ROLES.CENTER_MANAGER, GATEWAY_ROLES.SUPER_ADMIN]), 
    userProxy
);



// 4. PATCH /api/users/me (Cập nhật thông tin cơ bản: Tên, SĐT)
router.patch("/users/me",
    authenticate,
    authorize([GATEWAY_ROLES.USER, GATEWAY_ROLES.CENTER_MANAGER, GATEWAY_ROLES.SUPER_ADMIN]),
    userProxy
);

// 💡 5. PUT /api/users/me/avatar (Cập nhật Avatar) [MỚI THÊM]
// Route này khớp với hàm 'updateAvatar' ở Frontend
router.put("/users/me/avatar",
    authenticate,
    authorize([GATEWAY_ROLES.USER, GATEWAY_ROLES.CENTER_MANAGER, GATEWAY_ROLES.SUPER_ADMIN]),
    userProxy
);

// 3. GET /api/users/:userId (Admin xem user cụ thể)
router.patch("/users",
    authenticate,
    authorize([GATEWAY_ROLES.SUPER_ADMIN]),
    userProxy
);
export default router;