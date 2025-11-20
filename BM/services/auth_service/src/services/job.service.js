// src/services/job.service.js
import prisma from '../prisma.js'; // Hoặc cách bạn import prisma

export const runCleanupJobs = async () => {
    console.log('[CRON JOB] Bắt đầu chạy job dọn dẹp...');
    
    try {
        const now = new Date();

        // 1. Tìm user IDs từ các token hết hạn
        const expiredTokens = await prisma.verificationToken.findMany({
            where: { expiresAt: { lt: now } },
            select: { userId: true }
        });

        if (expiredTokens.length === 0) {
            console.log('[CRON JOB] Không có token hết hạn. Hoàn tất.');
            return;
        }

        const userIdsToDelete = expiredTokens.map(token => token.userId);

        // 2. Xóa các User chưa xác thực liên quan
        const deletedUserCount = await prisma.user.deleteMany({
            where: {
                id: { in: userIdsToDelete },
                isVerified: false 
            }
        });

        // 3. Xóa các Token hết hạn
        const deletedTokenCount = await prisma.verificationToken.deleteMany({
            where: { expiresAt: { lt: now } }
        });

        console.log(`[CRON JOB] Đã xóa ${deletedUserCount.count} user và ${deletedTokenCount.count} token.`);

    } catch (error) {
        console.error('[CRON JOB ERROR]', error);
    }
};