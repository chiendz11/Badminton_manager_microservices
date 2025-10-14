// services/auth_service/src/services/token.service.js

import jwt from 'jsonwebtoken';
import ms from 'ms'; 
import prisma from '../prisma.js';
import { JWT_SECRET, JWT_EXPIRY, JWT_REFRESH_SECRET, REFRESH_TOKEN_EXPIRY } from '../config/env.config.js'; 

/**
 * Tạo Access Token (JWT)
 * @param {object} user - Đối tượng user chứa id và role
 * @returns {string} Access Token
 */
export const generateAccessToken = (user) => {
    return jwt.sign(
        { userId: user.id, role: user.role, type: 'access' },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRY }
    );
};

/**
 * Tạo Refresh Token (JWT) và lưu vào DB
 * @param {string} userId - ID của người dùng
 * @returns {Promise<string>} Refresh Token
 */
export const createAndStoreRefreshToken = async (userId) => {
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
            token, // Lưu token nguyên bản
            expiresAt,
        }
    });
    return token;
};

/**
 * Xử lý việc xoay vòng tokens (Rotation)
 * @param {string} token - Refresh Token cũ
 */
export const refreshTokens = async (token) => {
    let payload;
    try {
        payload = jwt.verify(token, JWT_REFRESH_SECRET);
    } catch (e) {
        throw new Error("Refresh token không hợp lệ hoặc bị giả mạo.");
    }

    const refreshTokenRecord = await prisma.refreshToken.findUnique({
        where: { token },
        include: { user: true }
    });

    if (!refreshTokenRecord || refreshTokenRecord.expiresAt < new Date()) {
        if(refreshTokenRecord) {
            await prisma.refreshToken.delete({ where: { id: refreshTokenRecord.id } });
        }
        throw new Error("Refresh token đã hết hạn hoặc không tồn tại.");
    }

    const user = refreshTokenRecord.user;

    // 1. Tạo Access Token MỚI
    const newAccessToken = generateAccessToken(user);

    // 2. Xoay vòng Refresh Token: Xóa token cũ và tạo token mới
    await prisma.refreshToken.delete({ where: { id: refreshTokenRecord.id } });
    const newRefreshToken = await createAndStoreRefreshToken(user.id);

    return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        user: { id: user.id, email: user.email, role: user.role }
    };
};