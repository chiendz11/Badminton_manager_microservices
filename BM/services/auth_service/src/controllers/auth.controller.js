// services/auth_service/src/controllers/authController.js

import { registerUser, authenticateUser, refreshTokens, verifyUserEmail, logoutUser } from '../services/auth.service.js';
import { Prisma } from '@prisma/client';
import ms from 'ms'; // Cần thiết cho maxAge

// -----------------------------------------------------------------
// 1. /users (Tạo tài khoản)
// -----------------------------------------------------------------

// POST /users
export const createUser = async (req, res, next) => {
    try {
        const newUser = await registerUser(req.body);
        res.status(202).json({ 
            message: "Đăng ký thành công. Vui lòng kiểm tra email để xác minh tài khoản.",
            user: newUser
        });
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return res.status(409).json({ message: "Email hoặc Tên đăng nhập đã được sử dụng." });
        }
        if (error.message.includes("Không thể gửi email")) {
             return res.status(503).json({ message: "Lỗi dịch vụ email. Vui lòng thử lại sau." });
        }
        next(error); 
    }
};

// GET /users/verify (Xác minh email)
export const verifyUser = async (req, res, next) => {
    const { token } = req.params;

    if (!token) {
        return res.status(400).send("Thiếu mã xác minh.");
    }

    try {
        await verifyUserEmail(token);
        
        res.setHeader('Content-Type', 'text/html');
        res.status(200).send(`<h1>Xác minh thành công!</h1><p>Địa chỉ email của bạn đã được xác minh. Bạn có thể đóng cửa sổ này và đăng nhập vào ứng dụng.</p>`);

    } catch (error) {
        res.status(400).send(`<h1>Lỗi xác minh</h1><p>${error.message}</p>`);
        next(error); 
    }
};

// -----------------------------------------------------------------
// 2. /sessions (Đăng nhập/Đăng xuất)
// -----------------------------------------------------------------

// POST /sessions
export const createSession = async (req, res, next) => {
    const { email, password } = req.body;
    try {
        // Bỏ qua kiểm tra isVerified ở đây vì đã được tích hợp trong authenticateUser
        const result = await authenticateUser(email, password, req); 

        res.cookie('refreshToken', result.refreshToken, { 
            httpOnly: true, 
            secure: process.env.NODE_ENV === 'production', 
            maxAge: ms(process.env.REFRESH_TOKEN_EXPIRY || '7d'), 
            sameSite: 'strict'
        });

        res.status(200).json({
            message: "Đăng nhập thành công!",
            accessToken: result.accessToken,
            user: result.user
        });
    } catch (error) {
        if (error.message.includes("không chính xác") || error.message.includes("vô hiệu hóa") || error.message.includes("xác minh email")) {
             return res.status(401).json({ message: error.message });
        }
        next(error);
    }
};

// DELETE /sessions
export const deleteSession = async (req, res, next) => {
    const refreshToken = req.cookies?.refreshToken;
    
    // Dù có token hay không, ta vẫn clear cookie
    res.clearCookie('refreshToken', { httpOnly: true, secure: process.env.NODE_ENV === 'production' });

    if (!refreshToken) {
        return res.status(200).json({ message: "Đăng xuất thành công. Không tìm thấy token cũ." });
    }

    try {
        await logoutUser(refreshToken);
        res.status(200).json({ message: "Đăng xuất thành công." });
    } catch (error) {
        // Bắt lỗi service nhưng vẫn trả về 200 vì mục đích client đã đạt được
        console.error("Lỗi xóa token:", error);
        res.status(200).json({ message: "Đăng xuất thành công, nhưng lỗi khi xóa token khỏi DB." });
    }
};

// -----------------------------------------------------------------
// 3. /tokens (Làm mới token)
// -----------------------------------------------------------------

// POST /tokens
export const createNewToken = async (req, res, next) => {
    const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;

    if (!refreshToken) {
        return res.status(401).json({ message: "Thiếu Refresh Token." });
    }

    try {
        const result = await refreshTokens(refreshToken);

        res.cookie('refreshToken', result.refreshToken, { 
            httpOnly: true, 
            secure: process.env.NODE_ENV === 'production', 
            maxAge: ms(process.env.REFRESH_TOKEN_EXPIRY || '7d'),
            sameSite: 'strict'
        });

        res.status(200).json({
            message: "Token đã được làm mới thành công.",
            accessToken: result.accessToken,
            user: result.user
        });
    } catch (error) {
        res.clearCookie('refreshToken', { httpOnly: true, secure: process.env.NODE_ENV === 'production' });
        return res.status(403).json({ message: error.message });
    }
};