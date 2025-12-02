// services/auth_service/src/services/token.service.js (ĐÃ SỬA ĐỔI)

import jwt from 'jsonwebtoken';
import ms from 'ms'; 
import prisma from '../prisma.js';
// 💡 Giả sử bạn import từ env.config.js
import { JWT_SECRET, JWT_EXPIRY, JWT_REFRESH_SECRET, REFRESH_TOKEN_EXPIRY } from '../configs/env.config.js'; 

export const TokenService = {
    
    /**
     * @description Tạo Access Token MỚI
     * @param {object} user - Đối tượng User đầy đủ (phải chứa passwordHash)
     */
    generateAccessToken: (user) => {
        return jwt.sign(
            { 
                userId: user.publicUserId,
                username: user.username, 
                role: user.role, 
                type: 'access',
                // 💡 1. THÊM VÀO PAYLOAD TOKEN
                // (An toàn vì đây là boolean, không phải hash)
                hasPassword: user.passwordHash !== null 
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRY }
        );
    },

    // (Hàm createAndStoreRefreshToken giữ nguyên)
    createAndStoreRefreshToken: async (userId) => {
        const expiryMilliseconds = ms(REFRESH_TOKEN_EXPIRY);
        const expiresAt = new Date(Date.now() + expiryMilliseconds);

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
            }
        });
        return token;
    },

    /**
     * @description Làm mới Access Token (và xoay vòng Refresh Token)
     */
    refreshTokens: async (token) => {
        let payload;
        try {
            payload = jwt.verify(token, JWT_REFRESH_SECRET);
        } catch (e) {
            throw new Error("Refresh token không hợp lệ hoặc bị giả mạo.");
        }

        const refreshTokenRecord = await prisma.refreshToken.findUnique({
            where: { token },
            // 💡 include: { user: true } SẼ LẤY CẢ passwordHash
            include: { user: true } 
        });

        // ... (Logic kiểm tra và xoay vòng tokens giữ nguyên) ...
        
        if (!refreshTokenRecord || refreshTokenRecord.expiresAt < new Date()) {
            if(refreshTokenRecord) {
                await prisma.refreshToken.delete({ where: { id: refreshTokenRecord.id } });
            }
            throw new Error("Refresh token đã hết hạn hoặc không tồn tại.");
        }

        // 💡 Đây là đối tượng user đầy đủ (chứa cả passwordHash)
        const user = refreshTokenRecord.user;

        // 1. Tạo Access Token MỚI (đã chứa hasPassword)
        const newAccessToken = TokenService.generateAccessToken(user);

        // 2. Xoay vòng Refresh Token
        await prisma.refreshToken.delete({ where: { id: refreshTokenRecord.id } });
        const newRefreshToken = await TokenService.createAndStoreRefreshToken(user.id);

        // 💡 2. SỬA LỖI Ở ĐÂY
        return {
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
            // Thêm 'hasPassword' vào đối tượng user trả về cho FE
            user: { 
                id: user.id, 
                email: user.email, 
                role: user.role,
                hasPassword: user.passwordHash !== null // <-- Thêm vào đây
            }
        };
    }
};