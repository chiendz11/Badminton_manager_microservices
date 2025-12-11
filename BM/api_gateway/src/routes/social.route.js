import { Router } from "express";
import proxy from "express-http-proxy";
import { GATEWAY_ROLES } from "../configs/role_mapping.config.js"; // Đảm bảo đường dẫn đúng
import { SOCIAL_SERVICE_URL } from "../configs/env.config.js"; // Đảm bảo đã khai báo biến này trong env
import { authenticate } from "../middleware/authenticate.middleware.js";
import { authorize } from "../middleware/authorize.middleware.js";

const router = Router();

// --- Cấu hình Proxy Tái sử dụng ---
const socialProxy = proxy(SOCIAL_SERVICE_URL, {
    // 1. Loại bỏ prefix /users để gửi path gọn gàng đến UserService
    // Ví dụ: Gateway nhận /users/me/avatar -> Gửi đi /me/avatar
    proxyReqPathResolver: (req) => {
        // Logic này sẽ biến "/api/users/me/avatar" thành "/api/me/avatar" 
        // (Tùy thuộc vào cách UserService của bạn định nghĩa route, 
        // nếu UserService đợi /api/users/me/avatar thì bỏ dòng replace này đi)
        // Nhưng theo code cũ của bạn thì UserService đang đợi /me/avatar nên dòng này ĐÚNG.
        return req.originalUrl.replace("/social", ""); 
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
        console.log(proxyReqOpts);
        return proxyReqOpts;
    },
    
    // 💡 Tăng giới hạn kích thước request cho Proxy (nếu ảnh lớn)
    limit: '10mb' 
});

router.get("/social/search-friends",
    authenticate,
    authorize([GATEWAY_ROLES.USER, GATEWAY_ROLES.CENTER_MANAGER, GATEWAY_ROLES.SUPER_ADMIN]),
    socialProxy
)

// 1. Decline Friend Request
router.post("/social/decline-request",
    authenticate,
    authorize([GATEWAY_ROLES.USER, GATEWAY_ROLES.CENTER_MANAGER, GATEWAY_ROLES.SUPER_ADMIN]),
    socialProxy
);

// 2. Accept Friend Request
router.post("/social/accept-request",
    authenticate,
    authorize([GATEWAY_ROLES.USER, GATEWAY_ROLES.CENTER_MANAGER, GATEWAY_ROLES.SUPER_ADMIN]),
    socialProxy
);

// 3. Remove Friend
router.delete("/social/remove-friend",
    authenticate,
    authorize([GATEWAY_ROLES.USER, GATEWAY_ROLES.CENTER_MANAGER, GATEWAY_ROLES.SUPER_ADMIN]),
    socialProxy
);

// 4. Get My Friends List
router.get("/social/my-friends",
    authenticate,
    authorize([GATEWAY_ROLES.USER, GATEWAY_ROLES.CENTER_MANAGER, GATEWAY_ROLES.SUPER_ADMIN]),
    socialProxy
);

// 5. Get Pending Requests
router.get("/social/pending-requests",
    authenticate,
    authorize([GATEWAY_ROLES.USER, GATEWAY_ROLES.CENTER_MANAGER, GATEWAY_ROLES.SUPER_ADMIN]),
    socialProxy
);

// (Optional) Send Friend Request - adding this in case you missed it earlier
router.post("/social/send-request",
    authenticate,
    authorize([GATEWAY_ROLES.USER, GATEWAY_ROLES.CENTER_MANAGER, GATEWAY_ROLES.SUPER_ADMIN]),
    socialProxy
);

router.get("/social/conversations",
    authenticate,
    authorize([GATEWAY_ROLES.USER, GATEWAY_ROLES.CENTER_MANAGER, GATEWAY_ROLES.SUPER_ADMIN]),
    socialProxy
)

router.post("/social/messages",
    authenticate,
    authorize([GATEWAY_ROLES.USER, GATEWAY_ROLES.CENTER_MANAGER, GATEWAY_ROLES.SUPER_ADMIN]),
    socialProxy // Forwards to POST /api/messages
);

export default router;