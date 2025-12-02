import { Router } from "express";
import proxy from "express-http-proxy";
import { NEWS_SERVICE_URL } from "../configs/env.config.js";
import { authenticate } from "../middleware/authenticate.middleware.js";
import { authorize } from "../middleware/authorize.middleware.js";
import { GATEWAY_ROLES } from "../configs/role_mapping.config.js";

const router = Router();

// --- Cấu hình proxy tới News Service ---
const newsProxy = proxy(NEWS_SERVICE_URL, {
  proxyReqPathResolver: (req) => {
    // Loại bỏ prefix /news
    return req.originalUrl.replace("/news", "");
  },
  proxyReqOptDecorator: (proxyReqOpts, req) => {
    // Nếu cần thông tin user gửi tới News Service
    if (req.user) {
      proxyReqOpts.headers["X-User-ID"] = req.user.id;
      proxyReqOpts.headers["X-User-Role"] = req.user.role;
    }
    return proxyReqOpts;
  },
  limit: "10mb",
});

// -------------------------------------------------------------------
// Định tuyến News qua Gateway
// -------------------------------------------------------------------

// Lấy tất cả tin tức (frontend không cần login)
router.get("/news", newsProxy);

// Tạo tin tức mới (ADMIN/SUPER_ADMIN)
router.post(
  "/news",
  authenticate,
  authorize([GATEWAY_ROLES.SUPER_ADMIN, GATEWAY_ROLES.ADMIN]),
  newsProxy
);

// Xóa tin tức (ADMIN/SUPER_ADMIN)
router.delete(
  "/news/:newsId",
  authenticate,
  authorize([GATEWAY_ROLES.SUPER_ADMIN, GATEWAY_ROLES.ADMIN]),
  newsProxy
);

export default router;
