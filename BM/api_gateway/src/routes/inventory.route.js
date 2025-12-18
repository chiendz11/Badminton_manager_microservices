import { Router } from "express";
import proxy from "express-http-proxy";
import { INVENTORY_SERVICE_URL } from "../configs/env.config.js";
import { authenticate } from "../middleware/authenticate.middleware.js";
import { authorize } from "../middleware/authorize.middleware.js";
import { GATEWAY_ROLES } from "../configs/role_mapping.config.js";

const router = Router();

// --- Cấu hình Proxy tới Inventory Service ---
const inventoryProxy = proxy(INVENTORY_SERVICE_URL, {
    proxyReqPathResolver: (req) => {
        // Lược bỏ prefix /inventories
        return req.originalUrl.replace("/inventories", "");
    },

    proxyReqOptDecorator: (proxyReqOpts, req) => {
        // Chuyển thông tin người dùng nếu có
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

// Lấy danh sách kho / chi tiết sản phẩm: không cần login
router.get("/inventories/center/:centerId", inventoryProxy);
router.get("/inventories", inventoryProxy);
router.get("/inventories/:inventoryId", inventoryProxy);

// Thêm / sửa / xóa inventory: cần login + role
router.post(
    "/inventories",
    authenticate,
    authorize([GATEWAY_ROLES.SUPER_ADMIN, GATEWAY_ROLES.ADMIN]), // Chỉ admin mới thêm
    inventoryProxy
);

router.put(
    "/inventories/:inventoryId",
    authenticate,
    authorize([GATEWAY_ROLES.SUPER_ADMIN, GATEWAY_ROLES.ADMIN]),
    inventoryProxy
);

router.delete(
    "/inventories/:inventoryId",
    authenticate,
    authorize([GATEWAY_ROLES.SUPER_ADMIN, GATEWAY_ROLES.ADMIN]),
    inventoryProxy
);


export default router;
