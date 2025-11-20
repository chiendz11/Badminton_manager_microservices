import { Router } from "express";
import { verifyInternalSecret } from "../middlewares/internalAuth.middleware.js";
// Giả sử logic tạo user nằm trong UserController
import { UserController } from "../controllers/user.controller.js";

const router = Router();

// ----------------------------------------------------
// API NỘI BỘ (CHỈ DÀNH CHO SERVICE KHÁC GỌI)
// ----------------------------------------------------

/**
 * Endpoint này (POST /users) dùng để tạo User Profile mới.
 * Nó được bảo vệ bởi middleware "Lính gác cổng".
 * Chỉ AuthService (đã biết secret) mới có thể gọi được.
 */
router.post(
    '/users', 
    verifyInternalSecret, // 💡 BẢO VỆ ROUTE NÀY
    UserController.createProfile // 💡 Hàm controller xử lý logic
);

export default router;