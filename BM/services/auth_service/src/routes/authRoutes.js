// services/auth_service/src/routes/authRoutes.js

import { Router } from "express";
import { createUser, createSession, deleteSession, createNewToken, verifyUser } from "../controllers/auth.controller.js"; 
import { validate } from "../middlewares/validation.middleware.js";
import { registerSchema, loginSchema } from "../validations/auth.validations.js";

const authRouter = Router();

// -----------------------------------------------------------------
// 1. Quản lý Người dùng (Users)
// -----------------------------------------------------------------

// POST /users: Đăng ký người dùng mới
authRouter.post('/users', validate(registerSchema), createUser);

// GET /users/verify: Xác minh email
authRouter.get('/verifications/:token', verifyUser);


// -----------------------------------------------------------------
// 2. Quản lý Phiên (Sessions)
// -----------------------------------------------------------------

// POST /sessions: Đăng nhập (Tạo phiên mới)
authRouter.post('/sessions', validate(loginSchema), createSession);

// DELETE /sessions: Đăng xuất (Xóa phiên hiện tại/Refresh Token)
authRouter.delete('/sessions', deleteSession);


// -----------------------------------------------------------------
// 3. Quản lý Tokens (Access Token)
// -----------------------------------------------------------------

// POST /tokens: Làm mới Access Token (sử dụng Refresh Token)
authRouter.post('/refresh_tokens', createNewToken); // Không cần validation body nếu lấy từ cookie

export default authRouter;