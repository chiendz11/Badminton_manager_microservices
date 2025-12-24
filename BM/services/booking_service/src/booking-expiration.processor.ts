import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Booking } from './Schema/booking.schema'; 
import { BookingStatus } from './Schema/booking.schema';
import { Logger, Inject } from '@nestjs/common'; // 👈 Thêm Inject
import Redis from 'ioredis'; // 👈 Thêm Redis
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq'; // 👈 Thêm RabbitMQ

@Processor('booking-expiration')
export class BookingProcessor extends WorkerHost {
  private readonly Logger = new Logger(BookingProcessor.name);

  constructor(
    @InjectModel(Booking.name) 
    private bookingModel: Model<Booking>,

    // 👇 1. INJECT THÊM REDIS ĐỂ ĐẾM SỐ LẦN
    @Inject('REDIS_CLIENT') 
    private readonly redisClient: Redis,

    // 👇 2. INJECT THÊM RABBITMQ ĐỂ BÁO CÁO USER SERVICE
    private readonly amqpConnection: AmqpConnection
  ) {
    super();
  }

  async process(job: Job<{ bookingId: string }>): Promise<any> {
    const { bookingId } = job.data;
    // this.Logger.log(`[Queue] Checking expiration for booking ID: ${bookingId}`);

    try {
      const booking = await this.bookingModel.findById(bookingId);

      if (!booking) {
        // Booking bị xóa hoặc không tồn tại thì thôi
        return;
      }

      // =========================================================
      // 💀 PHÁT HIỆN: HẾT GIỜ MÀ VẪN PENDING (Bùng kèo)
      // =========================================================
      if (booking.bookingStatus === BookingStatus.PENDING) {
        
        // A. Hủy Booking (Logic cũ của bạn)
        booking.bookingStatus = BookingStatus.CANCELLED;
        await booking.save();
        this.Logger.warn(`[Queue] ⏳ Booking ${bookingId} CANCELLED (Unpaid timeout).`);

        // =========================================================
        // 🛑 B. LOGIC MỚI: TÍNH ĐIỂM PHẠT (COOLDOWN PENALTY)
        // =========================================================
        const userId = booking.userId.toString(); // Lấy userId từ booking
        const streakKey = `hoarding_streak:${userId}`;
        const MAX_STRIKES = 3; 
        const WINDOW_DURATION = 60 * 60; // 1 tiếng

        // 1. Tăng biến đếm
        const currentStreak = await this.redisClient.incr(streakKey);

        // 2. Nếu là lần đầu tiên, set thời gian reset là 1 tiếng
        if (currentStreak === 1) {
            await this.redisClient.expire(streakKey, WINDOW_DURATION);
        }

        this.Logger.log(`⚠️ User ${userId} Unpaid Streak: ${currentStreak}/${MAX_STRIKES}`);

        // 3. KIỂM TRA NGƯỠNG PHẠT
        if (currentStreak >= MAX_STRIKES) {
            
            // a. TẠO ÁN PHẠT NGUỘI (Redis Key này sẽ chặn createBooking)
            const penaltyKey = `hoarding_penalty:${userId}`;
            await this.redisClient.set(penaltyKey, 'LOCKED', 'EX', 30 * 60); // Cấm 30 phút

            // b. Xóa streak (Reset lại đếm từ 0)
            await this.redisClient.del(streakKey);

            // c. Báo cáo lên User Service (Lưu vết đen vào DB)
            this.amqpConnection.publish(
                'booking_exchange', 
                'user.spam.detected', 
                { 
                    userId: userId, 
                    reason: 'Hoarding Bookings (Unpaid 3 times in 1h)',
                    timestamp: new Date()
                }
            );
            
            this.Logger.error(`🚨 User ${userId} PENALIZED for 30 minutes due to hoarding.`);
        }
        // =========================================================

      } else {
        // Nếu đã CONFIRMED hoặc PROCESSING thì bỏ qua
        // this.Logger.log(`[Queue] Booking ${bookingId} is safe. Status: ${booking.bookingStatus}`);
      }
    } catch (error) {
      this.Logger.error(`[Queue] Error processing job ${job.id}:`, error);
      throw error;
    }
  }
}