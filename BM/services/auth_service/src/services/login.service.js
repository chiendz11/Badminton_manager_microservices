// services/auth_service/src/services/security.service.js

import prisma from '../prisma.js';
import { add } from 'date-fns';

const MAX_ATTEMPTS = 5;         // Số lần thử tối đa trước khi khóa
const LOCKOUT_MINUTES = 30;     // Thời gian khóa (phút)

/**
 * Xử lý khi đăng nhập thất bại: Tăng số lần thất bại, và khóa nếu đạt ngưỡng.
 * @param {string} userId - ID của người dùng
 */
export const handleFailedLoginAttempt = async (userId) => {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return; // Không làm gì nếu user không tồn tại

    const newAttempts = (user.failedLoginAttempts || 0) + 1;
    let updateData = { failedLoginAttempts: newAttempts };

    if (newAttempts >= MAX_ATTEMPTS) {
        // Khóa tài khoản và tính thời gian mở khóa
        updateData.lockoutUntil = add(new Date(), { minutes: LOCKOUT_MINUTES });
        
        await prisma.user.update({ where: { id: userId }, data: updateData });

        throw new Error(`Tài khoản đã bị khóa do đăng nhập thất bại quá ${MAX_ATTEMPTS} lần. Thử lại sau ${LOCKOUT_MINUTES} phút.`);
    }

    await prisma.user.update({ where: { id: userId }, data: updateData });
};

/**
 * Xử lý khi đăng nhập thành công: Đặt lại số lần thất bại và mở khóa (nếu đang bị khóa).
 * @param {string} userId - ID của người dùng
 */
export const handleSuccessfulLogin = async (userId) => {
    await prisma.user.update({
        where: { id: userId },
        data: {
            failedLoginAttempts: 0,
            lockoutUntil: null, // Đặt lại thời gian khóa
        }
    });
};