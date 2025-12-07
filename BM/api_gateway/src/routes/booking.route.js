import { Router } from "express";
import proxy from "express-http-proxy";
import { GATEWAY_ROLES } from "../configs/role_mapping.config.js"; // Đảm bảo đường dẫn đúng
import { BOOKING_SERVICE_URL } from "../configs/env.config.js"; // Đảm bảo đã khai báo biến này trong env
import { authenticate } from "../middleware/authenticate.middleware.js";
import { authorize } from "../middleware/authorize.middleware.js";

const router = Router();

// --- Cấu hình Proxy cho Booking Service ---
const bookingProxy = proxy(BOOKING_SERVICE_URL, {
    // 1. Path Resolver: Chuyển /api/booking/xyz -> /api/xyz (đến Booking Service)
    proxyReqPathResolver: (req) => {
        let path = req.originalUrl;
        // Ví dụ: "/api/booking/pending/mapping"

        if (path.startsWith("/api/booking/")) {
            // Giữ prefix /api/ và CHỈ xoá "booking/"
            return "/api/" + path.slice("/api/booking/".length);
        }

        return path;  // không phải booking service → để nguyên
    },  

    // 2. Decorator: Gắn thông tin User đã xác thực vào Header để Service con dùng
    proxyReqOptDecorator: (proxyReqOpts, req) => {
        if (req.user) {
            // Chuyển ID và Role sang header để Booking Service không cần verify token lại
            proxyReqOpts.headers['X-User-ID'] = req.user.id;
            proxyReqOpts.headers['X-User-Role'] = req.user.role;

            // Nếu có thông tin name/phone từ token, cũng có thể bắn sang
            if (req.user.name) proxyReqOpts.headers['X-User-Name'] = req.user.name;
            if (req.user.phone) proxyReqOpts.headers['X-User-Phone'] = req.user.phone;
        }
        return proxyReqOpts;
    },

    // Giới hạn body size nếu cần (tránh lỗi payload too large)
    limit: '5mb'
});

// -------------------------------------------------------------------
// Định tuyến (Routes)
// -------------------------------------------------------------------

// 1. GET /api/booking/pending/mapping
// Chức năng: Lấy trạng thái màu sắc các sân (Polling)
// Quyền: User, Center Manager, Admin đều xem được
router.get("/booking/pending/mapping",
    authenticate,
    authorize([
        GATEWAY_ROLES.USER,
        GATEWAY_ROLES.CENTER_MANAGER,
        GATEWAY_ROLES.SUPER_ADMIN
    ]),
    bookingProxy
);

// 2. POST /api/booking/pending/pendingBookingToDB
// Chức năng: User xác nhận đặt sân (Check-and-Lock)
// Quyền: Chỉ User mới được đặt sân (hoặc Manager đặt hộ)
router.post("/booking/pending/pendingBookingToDB",
    authenticate,
    authorize([
        GATEWAY_ROLES.USER,
        GATEWAY_ROLES.CENTER_MANAGER // Nếu cho phép chủ sân đặt hộ khách
    ]),
    bookingProxy
);

router.get("/booking/:id/status",
    authenticate,
    authorize([
        GATEWAY_ROLES.USER,
        GATEWAY_ROLES.CENTER_MANAGER,
        GATEWAY_ROLES.SUPER_ADMIN
    ]),
    bookingProxy
);

router.post("/booking/payment/create-link",
    authenticate,
    authorize([
        GATEWAY_ROLES.USER,
        GATEWAY_ROLES.CENTER_MANAGER
    ]),
    bookingProxy
);

router.get("/user/:userId/booking-history",
    authenticate,
    authorize([
        GATEWAY_ROLES.USER
    ]),
    bookingProxy
);

// --- Các route mở rộng khác (Booking History, Cancel...) ---
// Bạn có thể thêm vào sau tương tự như trên

export default router;