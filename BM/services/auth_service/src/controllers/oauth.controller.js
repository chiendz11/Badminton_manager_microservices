// services/auth_service/src/controllers/oauth.controller.js

import { OAuthService } from '../services/oauth.service.js';
import ms from 'ms';
import { 
    NODE_ENV, 
    FRONTEND_URL,         // Chỉ cần URL này
    REFRESH_TOKEN_EXPIRY 
} from '../configs/env.config.js';

export const OAuthController = {
    /**
     * GET /google/login
     * Frontend gọi API này để lấy URL redirect sang Google
     */
    googleLogin: (req, res, next) => {
        try {
            // 1. Định danh Client ID
            // Vì chỉ có User dùng Google -> Fix cứng luôn là 'user-app'
            // (Service cần cái này để lưu vào DB field authClientId)
            const authClientId = 'USER_UI_ID'; 

            // 2. Gọi Service để tạo URL (Service sẽ mã hóa clientId vào state)
            const googleOAuthUrl = OAuthService.getGoogleOAuthURL(authClientId);

            // 3. 💡 FIX LỖI INVALID STATE:
            // Trích xuất chuỗi 'state' thực sự mà Service đã tạo ra từ URL
            const urlObj = new URL(googleOAuthUrl);
            const stateGeneratedByService = urlObj.searchParams.get('state');

            // 4. Lưu chuỗi state ĐÓ vào cookie (HttpOnly) để đối chiếu khi quay về
            res.cookie('oauth_state', stateGeneratedByService, {
                maxAge: ms('5m'), 
                httpOnly: true,
                secure: NODE_ENV === 'production',
                sameSite: 'lax' // Bắt buộc là lax để cookie tồn tại qua redirect
            });

            // 5. Redirect người dùng sang Google
            res.redirect(googleOAuthUrl);

        } catch (error) {
            next(error);
        }
    },

    /**
     * GET /google/callback
     * Google redirect về đây kèm theo ?code=...&state=...
     */
    googleCallback: async (req, res, next) => {
        const { code, state } = req.query;
        const storedState = req.cookies?.oauth_state;

        try {
            // 0. Xóa cookie state ngay lập tức (dùng 1 lần)
            res.clearCookie('oauth_state', { httpOnly: true, sameSite: 'lax' });

            // 1. Validate Input
            if (!code) throw new Error("Thiếu mã ủy quyền (code).");
            
            // 2. Validate State (So sánh state Google trả về vs Cookie)
            if (!state || !storedState || state !== storedState) {
                console.error(`State mismatch: Server sent ${storedState} but got back ${state}`);
                throw new Error("Lỗi xác thực (invalid state). Vui lòng thử lại.");
            }

            // 3. Gọi Service xử lý (Trao đổi Code lấy Token, Tạo User...)
            const result = await OAuthService.handleGoogleCallback(code, req);

            // 4. Lưu Refresh Token vào HttpOnly Cookie
            res.cookie('refreshToken', result.refreshToken, {
                httpOnly: true,
                secure: NODE_ENV === 'production',
                maxAge: ms(REFRESH_TOKEN_EXPIRY || '7d'),
                sameSite: 'strict' 
            });

            // 5. 💡 REDIRECT VỀ USER FRONTEND
            // Không cần check Admin nữa, luôn về FRONTEND_URL
            const targetRedirectUrl = FRONTEND_URL || 'http://localhost:3000';
            
            const redirectUrl = new URL(targetRedirectUrl);
            // Gắn AccessToken vào URL để Frontend lấy và lưu vào Memory
            redirectUrl.searchParams.append('accessToken', result.accessToken);

            res.redirect(redirectUrl.toString());

        } catch (error) {
            console.error("Lỗi Google Callback:", error.message);
            
            // Redirect về trang Login của User App kèm thông báo lỗi
            const errorRedirectUrl = new URL((FRONTEND_URL || 'http://localhost:3000') + '/login');
            errorRedirectUrl.searchParams.append('error', error.message);
            
            res.redirect(errorRedirectUrl.toString());
        }
    }
};