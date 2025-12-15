import { Router } from "express";
import proxy from "express-http-proxy";
import { authenticate } from "../middleware/authenticate.middleware.js";
import { authorize } from "../middleware/authorize.middleware.js";
import { AUTH_SERVICE_URL } from "../configs/env.config.js";

// 💡 IMPORT CÁC VAI TRÒ MỚI TỪ BẢN ĐỒ (MAP)
import { GATEWAY_ROLES } from "../configs/role_mapping.config.js";

const router = Router();

// ... (authProxy không đổi) ...
const authProxy = proxy(AUTH_SERVICE_URL, {
  proxyReqPathResolver: (req) => req.originalUrl.replace("/auth", ""),
  // 2. Chuyển tiếp thông tin người dùng đã xác thực (từ req.user) vào header
    proxyReqOptDecorator: (proxyReqOpts, req) => {
        // req.user được gán bởi authenticateJWT
        if (req.user) {
            proxyReqOpts.headers['X-User-ID'] = req.user.id;
            proxyReqOpts.headers['X-User-Role'] = req.user.role;
        }
        return proxyReqOpts;
    },
});

// -----------------------------------------------------------------
// Định tuyến (Routes) cho Users
// -----------------------------------------------------------------
router.post("/users", authProxy); // Đăng ký người dùng

router.put("/users/:userId/password",
    authenticate, 
    authorize([GATEWAY_ROLES.SUPER_ADMIN]), // Phân quyền Admin
    authProxy);

router.patch("/users/:userId/status", // Cập nhật trạng thái kích hoạt người dùng
  authenticate, // Yêu cầu đăng nhập
  // 💡 SỬA LỖI: Cập nhật mảng vai trò
  authorize([GATEWAY_ROLES.SUPER_ADMIN]), 
  authProxy); // Proxy người dùng
// 💡 ROUTE MỚI: TẠO CENTER MANAGER (CHỈ ADMIN MỚI ĐƯỢC PHÉP)
// 💡 ROUTE MỚI: ĐỔI MẬT KHẨU

router.put("/users/me/password",
  authenticate, // 1. Yêu cầu đăng nhập
  authorize([ // 2. Yêu cầu có vai trò hợp lệ
    GATEWAY_ROLES.USER, 
    GATEWAY_ROLES.CENTER_MANAGER, 
    GATEWAY_ROLES.SUPER_ADMIN
  ]),
  authProxy // 3. Chuyển tiếp đến AuthService
);

router.post("/admin/users", 
  authenticate, // 1. Xác thực người dùng (login)
  // 2. Ủy quyền: Chỉ cho phép SUPER_ADMIN hoặc ADMIN tạo manager
  authorize([GATEWAY_ROLES.SUPER_ADMIN]), 
  authProxy);


// -----------------------------------------------------------------
// Định tuyến (Routes) cho Authentication
// -----------------------------------------------------------------
router.post("/auth/login", authProxy); // Đăng nhập người dùng
router.post("/auth/refresh-token", authProxy); // Làm mới token người dùng
router.get("/auth/verify-user/:token", authProxy); // Xác minh email người dùng

router.delete("/auth/logout", // Đăng xuất người dùng
  authenticate, // Xác thực người dùng
  // 💡 SỬA LỖI: Cập nhật mảng vai trò
  authorize([GATEWAY_ROLES.USER, GATEWAY_ROLES.CENTER_MANAGER, GATEWAY_ROLES.SUPER_ADMIN]), 
  authProxy); // Proxy người dùng

router.post("/auth/forgot-password", authProxy);
router.post("/auth/reset-password", authProxy); // 💡 ROUTE MỚI: Đặt lại mật khẩu từ link email



// ... (Các route Google không đổi) ...
router.get("/auth/google/login", authProxy);
router.get("/auth/google/callback", authProxy);
export default router;