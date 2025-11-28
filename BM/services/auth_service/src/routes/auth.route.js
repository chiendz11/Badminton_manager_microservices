// services/auth_service/src/routes/authRoutes.js (ĐÃ SỬA ĐỔI)

import { Router } from "express";
import { AuthController } from "../controllers/auth.controller.js";
import { validate } from "../middlewares/validation.middleware.js";

import { registerSchema, loginSchema, changePasswordSchema, adminResetPasswordSchema } from "../validations/auth.validations.js"; 

const authRouter = Router();

// -----------------------------------------------------------------
// 1. Quản lý Người dùng (Users)
// -----------------------------------------------------------------

// POST /users: Đăng ký người dùng mới
authRouter.post('/users', validate(registerSchema), AuthController.createUser);

authRouter.post('/admin/users', // NÊN CÓ: Validate body
    AuthController.createManagerByAdmin // Handler mới
);

// GET /verify-user/:token: Xác minh email người dùng
authRouter.get('/verify-user/:token', AuthController.verifyUser);


// -----------------------------------------------------------------
// 2. Đăng nhập và Đăng xuất
// -----------------------------------------------------------------

// POST /login: Đăng nhập (Tạo phiên mới)
authRouter.post('/login', validate(loginSchema), AuthController.createSession);

// DELETE /logout: Đăng xuất (Xóa phiên hiện tại/Refresh Token)
authRouter.delete('/logout', AuthController.deleteSession);


// -----------------------------------------------------------------
// 3. Quản lý Tokens (Access Token) 
// -----------------------------------------------------------------

// POST /refresh_tokens: Làm mới Access Token (sử dụng Refresh Token)
authRouter.post('/refresh-token', AuthController.createNewToken);


// -----------------------------------------------------------------
// 💡 MỤC MỚI: 4. Quản lý Mật khẩu
// -----------------------------------------------------------------

/**
 * PUT /change-password: Đổi mật khẩu
 * - Yêu cầu người dùng phải đăng nhập (dùng authMiddleware).
 * - authMiddleware sẽ lấy `userId` từ Access Token và gắn vào `req.user.id`.
 */
authRouter.put(
    '/users/me/password',
    validate(changePasswordSchema), // 💡 NÊN CÓ: Validate body
    AuthController.changePassword   // 💡 Handler mới
);

authRouter.put(
    '/users/:userId/password',
    // 💡 KHÔNG cần validate cũ (oldPassword là không cần thiết)
    // Nếu bạn muốn validate độ mạnh của newPassword:
    validate(adminResetPasswordSchema), 
    AuthController.adminResetPassword
);


export default authRouter;