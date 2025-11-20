// services/auth_service/src/controllers/oauth.controller.js

import { OAuthService } from '../services/oauth.service.js';
import ms from 'ms';
import { v4 as uuidv4 } from 'uuid';
import { 
    NODE_ENV, 
    FRONTEND_URL, 
    REFRESH_TOKEN_EXPIRY 
} from '../configs/env.config.js'; // (Hãy chắc chắn đường dẫn này đúng)

export const OAuthController = {
    /**
     * GET /google/login
     * Bắt đầu luồng đăng nhập, chuyển hướng người dùng đến Google.
     */
    googleLogin: (req, res, next) => {
        try {
            // 1. Tạo 'state' ngẫu nhiên để chống tấn công CSRF
            const state = uuidv4();

            // 2. Lưu state vào cookie (HttpOnly, SameSite=Lax)
            // 'lax' là cần thiết cho redirect đi và quay về
            res.cookie('oauth_state', state, {
                maxAge: ms('5m'), // 5 phút
                httpOnly: true,
                secure: NODE_ENV === 'production',
                sameSite: 'lax'
            });

            // 3. Lấy URL xác thực của Google
            const googleOAuthUrl = OAuthService.getGoogleOAuthURL(state);

            // 4. Redirect người dùng đến Google
            res.redirect(googleOAuthUrl);
        } catch (error) {
            next(error);
        }
    },

    /**
     * GET /google/callback
     * Xử lý callback từ Google, đăng nhập hoặc tạo user, và redirect về Frontend.
     */
    googleCallback: async (req, res, next) => {
        const { code, state } = req.query;
        const storedState = req.cookies?.oauth_state;

        try {
            // 0. Xóa cookie state (dùng 1 lần)
            res.clearCookie('oauth_state', { httpOnly: true, sameSite: 'lax' });

            // 1. Kiểm tra State (chống CSRF) và Code
            if (!code) {
                throw new Error("Thiếu mã ủy quyền (code).");
            }
            if (!state || !storedState || state !== storedState) {
                throw new Error("Lỗi xác thực (invalid state).");
            }

            // 2. Gọi Service để xử lý
            const result = await OAuthService.handleGoogleCallback(code, req);

            // 3. Thiết lập Refresh Token vào HttpOnly Cookie
            // Dùng 'strict' vì cookie này chỉ dùng cho API của chính mình
            res.cookie('refreshToken', result.refreshToken, {
                httpOnly: true,
                secure: NODE_ENV === 'production',
                maxAge: ms(REFRESH_TOKEN_EXPIRY || '7d'),
                sameSite: 'strict'
            });

            // 4. Redirect về trang chủ của Frontend
            res.redirect(FRONTEND_URL || '/');

        } catch (error) {
            console.error("Lỗi Google Callback Controller:", error.message);
            // 5. Nếu lỗi, redirect về trang đăng nhập của Frontend với thông báo lỗi
            const frontendLoginUrl = process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/login` : '/login';
            const errorMessage = (error.statusCode === 403) ? error.message : "Đăng nhập Google thất bại.";
            res.redirect(`${frontendLoginUrl}?error=${encodeURIComponent(errorMessage)}`);
        }
    }
};