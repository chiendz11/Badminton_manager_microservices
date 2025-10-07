// services/auth_service/src/services/authService.js

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import prisma from '../prisma.js';
import { JWT_SECRET, JWT_EXPIRY, JWT_REFRESH_SECRET, REFRESH_TOKEN_EXPIRY } from '../config/env.config.js'; 
import { add } from 'date-fns'; 
import { v4 as uuidv4 } from 'uuid';
import ms from 'ms'; 
import { sendVerificationEmail } from './email.service.js'; // SỬ DỤNG EMAIL SERVICE MỚI

const SALT_ROUNDS = 10;

/**
 * Tạo Access Token (JWT)
 */
const generateAccessToken = (user) => {
    return jwt.sign(
        { userId: user.id, role: user.role, type: 'access' },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRY }
    );
};

/**
 * Tạo Refresh Token (JWT) và lưu vào DB
 */
const createAndStoreRefreshToken = async (userId) => {
    // Thời gian hết hạn tính bằng miliseconds
    const expiryMilliseconds = ms(REFRESH_TOKEN_EXPIRY);
    const expiresAt = new Date(Date.now() + expiryMilliseconds);

    // Dùng JWT để tạo Refresh Token. Payload chỉ chứa userId và type.
    const token = jwt.sign(
        { userId, type: 'refresh' },
        JWT_REFRESH_SECRET,
        { expiresIn: REFRESH_TOKEN_EXPIRY }
    );

    // Lưu token (hash hoặc nguyên bản) và thời gian hết hạn vào DB
    await prisma.refreshToken.create({
        data: {
            userId,
            token, // Lưu token nguyên bản (dễ tìm kiếm)
            expiresAt,
        }
    });
    return token;
};

// ... (Hàm registerUser không đổi) ...
export const registerUser = async (data) => {
    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);
    
    // Bỏ qua confirmPassword (đã được Joi xử lý)
    const newUser = await prisma.user.create({
        data: {
            email: data.email,
            username: data.username,
            passwordHash,
            role: Role.USER,
        },
        select: { id: true, email: true, username: true, role: true, createdAt: true }
    });

    // 1. Tạo Verification Token
    const verificationToken = uuidv4(); 
    const expiresAt = new Date(Date.now() + ms('24h')); // Hết hạn sau 24 giờ

    await prisma.verificationToken.create({
        data: {
            userId: newUser.id,
            token: verificationToken,
            expiresAt: expiresAt,
        }
    });

    // 2. Gửi email xác minh
    await sendVerificationEmail(newUser.email, verificationToken); // Dùng await để bắt lỗi gửi email

    return newUser;
};


export const authenticateUser = async (email, password, req) => {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.passwordHash) {
        throw new Error("Thông tin đăng nhập không chính xác.");
    }
    if (!user.isActive) {
        throw new Error("Tài khoản của bạn đã bị vô hiệu hóa.");
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
        // TODO: Cập nhật failedLogins tại đây
        throw new Error("Thông tin đăng nhập không chính xác.");
    }

    // Tạo Tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = await createAndStoreRefreshToken(user.id);
    
    // Tạo Session
    const sessionExpiresAt = add(new Date(), { days: 30 }); // Session 30 ngày
    await prisma.session.create({
        data: {
            userId: user.id,
            ipAddress: req.ip || 'unknown',
            userAgent: req.headers['user-agent'] || 'unknown',
            expiresAt: sessionExpiresAt,
        }
    });

    return {
        accessToken,
        refreshToken,
        user: { id: user.id, username: user.username, email: user.email, role: user.role }
    };
};


export const refreshTokens = async (token) => {
    let payload;
    try {
        // Xác thực token bằng secret dành cho Refresh Token
        payload = jwt.verify(token, JWT_REFRESH_SECRET);
    } catch (e) {
        throw new Error("Refresh token không hợp lệ hoặc bị giả mạo.");
    }

    // 1. Tìm kiếm token trong DB (đảm bảo token chưa bị thu hồi)
    const refreshTokenRecord = await prisma.refreshToken.findUnique({
        where: { token },
        include: { user: true }
    });

    if (!refreshTokenRecord || refreshTokenRecord.expiresAt < new Date()) {
        // Xóa token hết hạn khỏi DB (Cleanup)
        if(refreshTokenRecord) {
            await prisma.refreshToken.delete({ where: { id: refreshTokenRecord.id } });
        }
        throw new Error("Refresh token đã hết hạn hoặc không tồn tại.");
    }

    const user = refreshTokenRecord.user;

    // 2. Tạo Access Token MỚI
    const newAccessToken = generateAccessToken(user);

    // 3. Xoay vòng Refresh Token (Rotation): Tạo token mới và xóa token cũ
    await prisma.refreshToken.delete({ where: { id: refreshTokenRecord.id } });
    const newRefreshToken = await createAndStoreRefreshToken(user.id);

    return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        user: { id: user.id, email: user.email, role: user.role }
    };
};

/**
 * Logic xác minh email
 */
export const verifyUserEmail = async (token) => {
    const tokenRecord = await prisma.verificationToken.findFirst({
        where: { token: token },
        include: { user: true }
    });

    if (!tokenRecord) {
        throw new Error("Mã xác minh không tồn tại.");
    }
    
    if (tokenRecord.expiresAt < new Date()) {
        await prisma.verificationToken.delete({ where: { id: tokenRecord.id } });
        throw new Error("Mã xác minh đã hết hạn.");
    }

    // Thực hiện transaction: Cập nhật User và xóa Token
    await prisma.$transaction([
        prisma.user.update({
            where: { id: tokenRecord.userId },
            data: { isVerified: true }
        }),
        prisma.verificationToken.delete({ where: { id: tokenRecord.id } })
    ]);

    return { message: "Xác minh email thành công!" };
};

/**
 * Xử lý việc đăng xuất: Xóa Refresh Token và Session tương ứng.
 * @param {string} refreshToken - Refresh Token được gửi từ client.
 */
export const logoutUser = async (refreshToken) => {
    // 1. Tìm và xóa Refresh Token (thu hồi quyền truy cập)
    const tokenRecord = await prisma.refreshToken.deleteMany({
        where: { token: refreshToken } // Dùng deleteMany vì token là duy nhất, nhưng an toàn hơn
    });

    if (tokenRecord.count === 0) {
        // Có thể không cần thông báo lỗi nếu xóa thứ không tồn tại
        console.log("[LOGOUT] Refresh token không tồn tại.");
    }
    
    // TRONG THỰC TẾ: Bạn cũng có thể xóa Session nếu muốn quản lý các phiên đã đăng nhập
    // (Tuy nhiên, việc xóa Refresh Token đã là đủ để thu hồi quyền)
    
    return true;
};