// src/services/cron.service.js

import cron from 'node-cron';
import prisma from '../prisma.js';
import { sub } from 'date-fns';

export const CronService = {
    /**
     * Khởi động các tác vụ chạy ngầm (Cron Jobs)
     */
    startCleanupJob: () => {
        console.log('[CronService] ⏳ Đã khởi tạo dịch vụ dọn dẹp tài khoản rác.');

        // Cấu hình: Chạy vào 00:00:00 mỗi ngày
        // Timezone: 'Asia/Ho_Chi_Minh' (Giờ Việt Nam)
        cron.schedule('0 0 * * *', async () => {
            console.log(`[CronService] 🧹 [${new Date().toLocaleString('vi-VN')}] Bắt đầu quét User chưa xác thực...`);
            await CronService.deleteUnverifiedUsers();
        }, {
            scheduled: true,
            timezone: "Asia/Ho_Chi_Minh" // 🇻🇳 QUAN TRỌNG: Ép buộc chạy theo giờ VN
        });
    },

    /**
     * Logic xóa các user chưa verify quá 24h
     */
    deleteUnverifiedUsers: async () => {
        try {
            // Lấy thời điểm 24 giờ trước
            const thresholdDate = sub(new Date(), { hours: 24 });

            // Thực hiện xóa
            const result = await prisma.user.deleteMany({
                where: {
                    isVerified: false,      // Chưa xác thực
                    createdAt: {
                        lt: thresholdDate   // Tạo trước mốc 24h
                    }
                }
            });

            if (result.count > 0) {
                console.log(`[CronService] ✅ Đã xóa thành công ${result.count} tài khoản rác.`);
            } else {
                console.log('[CronService] ✨ Hệ thống sạch sẽ, không tìm thấy tài khoản rác nào.');
            }

        } catch (error) {
            console.error('[CronService] ❌ Lỗi khi thực hiện dọn dẹp User:', error);
        }
    }
};