import cron from 'node-cron';
import { User } from '../models/user.model.js';
import { publishToExchange, ROUTING_KEYS } from '../clients/rabbitmq.client.js';
import consola from 'consola';

const SPAM_BAN_DURATION = 30 * 60 * 1000; // 30 phút

export const initSpamCleanerCron = () => {
    // Chạy mỗi 5 phút
    cron.schedule('*/5 * * * *', async () => {
        try {
            consola.info("[Cron] 🧹 Scanning for expired spam bans...");

            const timeThreshold = new Date(Date.now() - SPAM_BAN_DURATION);

            // 1. Tìm user đang bị khóa VÀ đã hết hạn
            const expiredSpammers = await User.find({
                isSpamming: true,
                lastSpamTime: { $lte: timeThreshold }
            }).select('userId email violationCount'); // Lấy thêm violationCount để log nếu cần

            if (expiredSpammers.length === 0) return;

            // 2. Mở khóa hàng loạt
            for (const user of expiredSpammers) {
                
                // [QUAN TRỌNG] Update DB:
                // - Set isSpamming = false (Hết án phạt)
                // - KHÔNG unset lastSpamTime (Để Admin còn xem lịch sử)
                // - KHÔNG reset violationCount (Để lưu vết tiền án)
                await User.updateOne(
                    { _id: user._id },
                    { 
                        $set: { isSpamming: false } 
                        // BỎ DÒNG NÀY: $unset: { lastSpamTime: 1 } 
                    }
                );

                // 3. Bắn event để User Service mở khóa (isActive = true)
                // Routing key này phải khớp với consumer bên User Service xử lý việc Unban
                await publishToExchange(ROUTING_KEYS.USER_STATUS_UPDATED, {
                    userId: user.userId,
                    isActive: true, // Mở khóa account gốc
                    isSpamming: false,
                    reason: 'AUTO_UNBAN_AFTER_30M'
                });

                consola.success(`[Cron] 🔓 Auto-unbanned user: ${user.email} | Violation History: ${user.violationCount || 1}`);
            }
        } catch (error) {
            consola.error("[Cron] Error in spam cleaner:", error);
        }
    });
};