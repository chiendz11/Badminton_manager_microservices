// services/auth_service/src/services/token.service.js

import jwt from 'jsonwebtoken';
import ms from 'ms'; 
import prisma from '../prisma.js';
import { JWT_SECRET, JWT_EXPIRY, JWT_REFRESH_SECRET, REFRESH_TOKEN_EXPIRY } from '../configs/env.config.js'; 

export const TokenService = {
    
    /**
     * @description Tạo Access Token MỚI
     * @param {object} user - Đối tượng User đầy đủ
     */
    generateAccessToken: (user) => {
        return jwt.sign(
            { 
                userId: user.publicUserId, 
                role: user.role, 
                type: 'access',
                // 💡 Giữ nguyên logic của bạn: thêm hasPassword
                hasPassword: user.passwordHash !== null 
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRY }
        );
    },

    /**
     * 🟢 CẬP NHẬT: Thêm tham số authClientId để binding token với ứng dụng
     */
    createAndStoreRefreshToken: async (userId, authClientId) => {
        const expiryMilliseconds = ms(REFRESH_TOKEN_EXPIRY);
        const expiresAt = new Date(Date.now() + expiryMilliseconds);

        // Tạo JWT cho Refresh Token (theo cách của bạn)
        const token = jwt.sign(
            { userId, type: 'refresh' },
            JWT_REFRESH_SECRET,
            { expiresIn: REFRESH_TOKEN_EXPIRY }
        );

        await prisma.refreshToken.create({
            data: {
                userId,
                token,
                expiresAt,
                authClientId // 👈 Lưu ID của App (Admin/User) vào DB
            }
        });
        return token;
    },

    /**
     * @description Làm mới Access Token (và xoay vòng Refresh Token)
     * 🟢 CẬP NHẬT: Nhận thêm incomingClientId để kiểm tra bảo mật
     */
    refreshTokens: async (token, incomingClientId) => {
        // 1. Verify JWT Signature
        try {
            jwt.verify(token, JWT_REFRESH_SECRET);
        } catch (e) {
            throw new Error("Refresh token không hợp lệ hoặc bị giả mạo.");
        }

        // 2. Tìm trong DB (Kèm thông tin AuthClient)
        const refreshTokenRecord = await prisma.refreshToken.findUnique({
            where: { token },
            include: { 
                user: true,
                authClient: true // 👈 Include để check Client ID
            } 
        });

        // 3. Check tồn tại và hết hạn
        if (!refreshTokenRecord || refreshTokenRecord.expiresAt < new Date()) {
            if(refreshTokenRecord) {
                await prisma.refreshToken.delete({ where: { id: refreshTokenRecord.id } });
            }
            throw new Error("Refresh token đã hết hạn hoặc không tồn tại.");
        }

        // 4. 🛡️ SECURITY CHECK: Đảm bảo Token thuộc về đúng Client App
        // Nếu token được tạo ở Admin UI nhưng mang sang User UI refresh -> CHẶN
        if (incomingClientId && refreshTokenRecord.authClient) {
            if (refreshTokenRecord.authClient.clientId !== incomingClientId) {
                // Xóa ngay token nghi ngờ bị đánh cắp
                await prisma.refreshToken.delete({ where: { id: refreshTokenRecord.id } });
                console.error(`[Security] Token bound to ${refreshTokenRecord.authClient.clientId} used by ${incomingClientId}`);
                throw new Error("Token không hợp lệ cho ứng dụng này (Client Mismatch).");
            }
        }

        const user = refreshTokenRecord.user;

        // 5. Tạo Access Token MỚI (đã chứa hasPassword)
        const newAccessToken = TokenService.generateAccessToken(user);

        // 6. Xoay vòng Refresh Token
        // Xóa token cũ
        await prisma.refreshToken.delete({ where: { id: refreshTokenRecord.id } });
        
        // 🟢 Tạo token mới: PHẢI TRUYỀN LẠI authClientId cũ để duy trì phiên đăng nhập đúng app
        const newRefreshToken = await TokenService.createAndStoreRefreshToken(
            user.id, 
            refreshTokenRecord.authClientId 
        );

        return {
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
            user: { 
                id: user.id, 
                email: user.email, 
                role: user.role,
                // 💡 Giữ nguyên logic của bạn
                hasPassword: user.passwordHash !== null 
            }
        };
    }
};