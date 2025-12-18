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
        // ... (Code cũ: lấy authClientId = 'USER_UI_ID', redirect Google) ...
        try {
           const authClientId = 'USER_UI_ID'; // 🟢 FIX CỨNG CLIENT ID CỦA USER APP
           const googleOAuthUrl = OAuthService.getGoogleOAuthURL(authClientId);
           
           const urlObj = new URL(googleOAuthUrl);
           const state = urlObj.searchParams.get('state');

           res.cookie('oauth_state', state, { 
               maxAge: ms('5m'), httpOnly: true, secure: NODE_ENV === 'production', sameSite: 'lax' 
           });
           res.redirect(googleOAuthUrl);
        } catch (e) { next(e); }
   },

    /**
     * GET /google/callback
     * Google redirect về đây kèm theo ?code=...&state=...
     */
    googleCallback: async (req, res, next) => {
        const { code, state } = req.query;
        const storedState = req.cookies?.oauth_state;

        try {
            res.clearCookie('oauth_state', { httpOnly: true, sameSite: 'lax' });

            if (!code) throw new Error("Thiếu code.");
            if (!state || !storedState || state !== storedState) throw new Error("Invalid state.");

            const result = await OAuthService.handleGoogleCallback(code, req);

            // 🟢 QUAN TRỌNG: OAUTH LUÔN SET COOKIE CHO USER APP
            // Tên cookie phải khớp với logic getCookieName('USER_UI_ID') bên AuthController
            res.cookie('user_refresh_token', result.refreshToken, { 
                httpOnly: true,
                secure: NODE_ENV === 'production',
                maxAge: ms(REFRESH_TOKEN_EXPIRY || '7d'),
                sameSite: 'strict' 
            });

            // Redirect về User Frontend
            const redirectUrl = new URL(FRONTEND_URL || 'http://localhost:3000');
            redirectUrl.searchParams.append('accessToken', result.accessToken);
            res.redirect(redirectUrl.toString());

        } catch (error) {
            console.error("Lỗi Google Callback:", error.message);
            const errUrl = new URL((FRONTEND_URL || 'http://localhost:3000') + '/login');
            errUrl.searchParams.append('error', error.message);
            res.redirect(errUrl.toString());
        }
    }
};