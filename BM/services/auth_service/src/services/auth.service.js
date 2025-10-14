// services/auth_service/src/services/auth.service.js

import bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import prisma from '../prisma.js';
import { add, isPast } from 'date-fns'; // Cần thêm isPast
import { v4 as uuidv4 } from 'uuid';
import ms from 'ms'; 
import { sendVerificationEmail } from './email.service.js';
// 💡 IMPORT CÁC SERVICE MỚI
import { generateAccessToken, createAndStoreRefreshToken } from './token.service.js'; 
import { handleFailedLoginAttempt, handleSuccessfulLogin } from './login.service.js'; 
import { isEmailFormat } from '../utils/validations.util.js';

const SALT_ROUNDS = 10;


// --- (Hàm registerUser không đổi) ---
export const registerUser = async (data) => {
    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);
    
    // ... logic tạo user, token và gửi email (giữ nguyên) ...
    const newUser = await prisma.user.create({
        data: {
            email: data.email,
            username: data.username,
            passwordHash,
            role: Role.USER,
        },
        select: { id: true, email: true, username: true, role: true, createdAt: true }
    });

    const verificationToken = uuidv4(); 
    const expiresAt = new Date(Date.now() + ms('24h')); 

    await prisma.verificationToken.create({
        data: {
            userId: newUser.id,
            token: verificationToken,
            expiresAt: expiresAt,
        }
    });
    await sendVerificationEmail(newUser.email, verificationToken);
    return newUser;
};
// ------------------------------------


/**
 * Logic Đăng nhập chính, sử dụng identifier (email HOẶC username)
 */
export const authenticateUser = async (identifier, password, req) => {
    let user;

    // 1. Tìm kiếm người dùng linh hoạt
    const isEmail = isEmailFormat(identifier);
    if (isEmail) {
        user = await prisma.user.findUnique({ where: { email: identifier } });
    } else {
        user = await prisma.user.findUnique({ where: { username: identifier } });
    }

    // 2. Kiểm tra tồn tại và khóa tài khoản
    if (!user || !user.passwordHash) {
        // Ném lỗi 400
        const error = new Error("Thông tin đăng nhập không chính xác.");
        throw Object.assign(error, { statusCode: 400 }); 
    }
    
    // 💡 KIỂM TRA KHÓA TÀI KHOẢN (Account Lockout)
    if (user.lockoutUntil && isPast(user.lockoutUntil)) {
        await handleSuccessfulLogin(user.id);
    } else if (user.lockoutUntil && !isPast(user.lockoutUntil)) {
        // Ném lỗi 403
        const error = new Error("Tài khoản của bạn đang bị khóa tạm thời do nhập sai mật khẩu quá nhiều lần.");
        throw Object.assign(error, { statusCode: 403 }); 
    }

    if (!user.isActive) {
        // Ném lỗi 403
        const error = new Error("Tài khoản của bạn đã bị vô hiệu hóa.");
        throw Object.assign(error, { statusCode: 403 }); 
    }
    if (!user.isVerified) {
        // Ném lỗi 403
        const error = new Error("Vui lòng xác minh email của bạn trước khi đăng nhập.");
        throw Object.assign(error, { statusCode: 403 }); 
    }
    
    // 3. So sánh mật khẩu
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
        await handleFailedLoginAttempt(user.id);
        // Ném lỗi 400
        const error = new Error("Thông tin đăng nhập không chính xác.");
        throw Object.assign(error, { statusCode: 400 }); 
    }

    // 4. Đăng nhập thành công
    await handleSuccessfulLogin(user.id);

    // Tạo Tokens và Session
    const accessToken = generateAccessToken(user);
    const refreshToken = await createAndStoreRefreshToken(user.id);
    
    const sessionExpiresAt = add(new Date(), { days: 30 });
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
        user: { id: user.id, username: user.username, email: user.email, role: user.role, isVerified: user.isVerified }
    };
};


// --- (Các hàm refreshTokens, verifyUserEmail, logoutUser được di chuyển hoặc giữ nguyên) ---

/**
 * Logic xác minh email
 */
export const verifyUserEmail = async (token) => {
    // ... (Logic giữ nguyên) ...
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
 * Xử lý việc đăng xuất: Xóa Refresh Token.
 */
export const logoutUser = async (refreshToken) => {
    // ... (Logic giữ nguyên) ...
    await prisma.refreshToken.deleteMany({
        where: { token: refreshToken }
    });
    return true;
};