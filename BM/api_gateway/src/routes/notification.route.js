import { Router } from "express";
import proxy from "express-http-proxy";
import { NOTIFICATION_SERVICE_URL } from "../configs/env.config.js";
import { authenticate } from "../middleware/authenticate.middleware.js";

const router = Router();

// --- Cấu hình Proxy tới Rating Service ---
const notificationProxy = proxy(NOTIFICATION_SERVICE_URL, {
    proxyReqPathResolver: (req) => {
        // Lược bỏ prefix /ratings
        return req.originalUrl.replace("/notification", "");
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

router.get(
  "/notification",
  authenticate, // Bắt buộc phải đăng nhập
  notificationProxy
);

// 2. Lấy số lượng thông báo chưa đọc
// Method: GET
// Gateway URL: /notification/api/unread/:userId
router.get(
  "/notification/unread",
  authenticate,
  notificationProxy
);

// 3. Đánh dấu tất cả là đã đọc
// Method: PATCH
// Gateway URL: /notification/api/read/:userId
router.patch(
  "/notification/read",
  authenticate,
  notificationProxy
);

export default router;