// services/auth_service/src/services/security.service.js (ĐÃ SỬA ĐỔI)

import prisma from '../prisma.js';
import { add } from 'date-fns';

const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 30;

export const LoginService = {
    handleFailedLoginAttempt: async (userId) => {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return;

        const newAttempts = (user.failedLoginAttempts || 0) + 1;
        let updateData = { failedLoginAttempts: newAttempts };

        if (newAttempts >= MAX_ATTEMPTS) {
            updateData.lockoutUntil = add(new Date(), { minutes: LOCKOUT_MINUTES });
            
            await prisma.user.update({ where: { id: userId }, data: updateData });

            throw new Error(`Tài khoản đã bị khóa do đăng nhập thất bại quá ${MAX_ATTEMPTS} lần. Thử lại sau ${LOCKOUT_MINUTES} phút.`);
        }

        await prisma.user.update({ where: { id: userId }, data: updateData });
    },

    handleSuccessfulLogin: async (userId) => {
        await prisma.user.update({
            where: { id: userId },
            data: {
                failedLoginAttempts: 0,
                lockoutUntil: null,
            }
        });
    }
};