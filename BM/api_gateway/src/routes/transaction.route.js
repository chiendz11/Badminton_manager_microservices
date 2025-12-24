import { Router } from "express";
import proxy from "express-http-proxy";
import { TRANSACTION_SERVICE_URL } from "../configs/env.config.js";
import { authenticate } from "../middleware/authenticate.middleware.js";
import { authorize } from "../middleware/authorize.middleware.js";
import { GATEWAY_ROLES } from "../configs/role_mapping.config.js";

const router = Router();

// --- Cấu hình Proxy tới Transaction Service ---
const transactionProxy = proxy(TRANSACTION_SERVICE_URL, {
    proxyReqPathResolver: (req) => {
        // Lược bỏ prefix /transactions
        return req.originalUrl.replace("/transactions", "");
    },
    proxyReqOptDecorator: (proxyReqOpts, req) => {
        // Chuyển thông tin người dùng cho Transaction Service
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

// Lấy lịch sử bán hàng của một trung tâm (có thể public)
router.get("/transactions/sell/:centerId", transactionProxy);
router.post(
    "/transactions/stock/new",
    authenticate,
    authorize([GATEWAY_ROLES.ADMIN, GATEWAY_ROLES.SUPER_ADMIN]),
    transactionProxy
);
router.get("/transactions/stock", transactionProxy);
router.get("/transactions/sell", transactionProxy);

// Thêm hóa đơn mới (user phải login)
router.post(
    "/transactions/sell",
    authenticate,
    authorize(GATEWAY_ROLES.USER),
    transactionProxy
);

// Lấy lịch sử nhập kho (có thể public)
router.get("/transactions/stock/:centerId", transactionProxy);

// Thêm lịch sử nhập kho (chỉ admin mới được)
router.post(
    "/transactions/stock",
    authenticate,
    authorize([GATEWAY_ROLES.ADMIN, GATEWAY_ROLES.SUPER_ADMIN]),
    transactionProxy
);

export default router;
