import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Booking } from '../Schema/booking.schema'; 
import { BookingStatus } from '../Schema/booking.schema';
import { Logger, Inject } from '@nestjs/common';
import Redis from 'ioredis';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';

@Processor('booking-expiration')
export class UserWorker extends WorkerHost {
  private readonly Logger = new Logger(UserWorker.name);

  constructor(
    @InjectModel(Booking.name) 
    private bookingModel: Model<Booking>,

    @Inject('REDIS_CLIENT') 
    private readonly redisClient: Redis,

    private readonly amqpConnection: AmqpConnection
  ) {
    super();
  }

  async process(job: Job<{ bookingId: string }>): Promise<any> {
    const { bookingId } = job.data;
    
    try {
      const booking = await this.bookingModel.findById(bookingId);

      if (!booking) return;

      // =========================================================
      // 💀 XỬ LÝ: HẾT GIỜ MÀ VẪN PENDING (Bùng kèo)
      // =========================================================
      if (booking.bookingStatus === BookingStatus.PENDING) {
        
        // 1. Cập nhật trạng thái Hủy
        booking.bookingStatus = BookingStatus.CANCELLED;
        await booking.save();
        
        const userId = booking.userId.toString();
        this.Logger.warn(`[Queue] ⏳ Booking ${bookingId} CANCELLED (Unpaid timeout).`);

        // 👇 [NOTI 1] BÁO KHÁCH: ĐƠN ĐÃ BỊ HỦY
        // Dùng y hệt cấu trúc bạn yêu cầu
        await this.amqpConnection.publish(
          'notification_exchange',
          'create_notification', 
          {
            userId: userId,
            notiMessage: `Đơn đặt sân #${bookingId.slice(-4)} đã bị hủy do quá hạn thanh toán.`,
            notiType: 'BOOKING_CANCELLED', // Frontend sẽ map type này để hiển thị icon/màu
            isRead: false
          }
        );

        // =========================================================
        // 🛑 TÍNH ĐIỂM PHẠT (HOARDING PENALTY)
        // =========================================================
        const streakKey = `hoarding_streak:${userId}`;
        const MAX_STRIKES = 3; 
        const WINDOW_DURATION = 60 * 60; // 1 tiếng

        const currentStreak = await this.redisClient.incr(streakKey);

        if (currentStreak === 1) {
            await this.redisClient.expire(streakKey, WINDOW_DURATION);
        }

        // 3. KIỂM TRA NGƯỠNG PHẠT
        if (currentStreak >= MAX_STRIKES) {
            
            // a. Tạo án phạt nguội (Redis Lock 30p)
            const penaltyKey = `hoarding_penalty:${userId}`;
            await this.redisClient.set(penaltyKey, 'LOCKED', 'EX', 30 * 60);

            // b. Reset streak
            await this.redisClient.del(streakKey);

            // 👇 [NOTI 2] BÁO KHÁCH: CẢNH BÁO KHÓA TÍNH NĂNG
            // Dùng y hệt cấu trúc bạn yêu cầu
            this.amqpConnection.publish(
              'notification_exchange',
              'create_notification', 
              {
                userId: userId,
                notiMessage: `CẢNH BÁO: Bạn bị khóa đặt sân 30 phút do hủy đơn quá nhiều lần.`,
                notiType: 'SYSTEM_ALERT', // Frontend sẽ map type này thành màu đỏ cảnh báo
                isRead: false
              }
            );
            
            this.Logger.error(`🚨 User ${userId} PENALIZED for 30 minutes.`);
        }
      }
    } catch (error) {
      this.Logger.error(`[Queue] Error processing job ${job.id}:`, error);
      throw error;
    }
  }
}