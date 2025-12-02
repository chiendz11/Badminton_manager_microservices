import { Router } from "express";
import proxy from "express-http-proxy";
import { RATING_SERVICE_URL } from "../configs/env.config.js";
import { authenticate } from "../middleware/authenticate.middleware.js";
import { authorize } from "../middleware/authorize.middleware.js";
import { GATEWAY_ROLES } from "../configs/role_mapping.config.js";

const router = Router();

// --- Cấu hình Proxy tới Rating Service ---
const ratingProxy = proxy(RATING_SERVICE_URL, {
    proxyReqPathResolver: (req) => {
        // Lược bỏ prefix /ratings
        return req.originalUrl.replace("/ratings", "");
    },

    proxyReqOptDecorator: (proxyReqOpts, req) => {
        // Chuyển thông tin người dùng cho Rating Service
        if (req.user) {
            proxyReqOpts.headers['X-User-ID'] = req.user.id;
            proxyReqOpts.headers['X-User-Name'] = req.user.username || "Ẩn danh";
        }
        return proxyReqOpts;
    },
    limit: '10mb'
});

// -------------------------------------------------------------------
// Định tuyến
// -------------------------------------------------------------------

// Lấy danh sách đánh giá: /api/ratings/:centerId (không cần login cũng xem được)
router.get("/ratings/:centerId", ratingProxy);

// Gửi đánh giá mới: /api/ratings (user phải login)
router.post(
    "/ratings",
    authenticate,
    authorize(GATEWAY_ROLES.USER),
    ratingProxy
);

router.delete(
    "/ratings/:ratingId",
    authenticate,
    authorize([GATEWAY_ROLES.ADMIN, GATEWAY_ROLES.SUPER_ADMIN]),
    ratingProxy
);

export default router;
