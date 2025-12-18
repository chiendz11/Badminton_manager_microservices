import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Inject,
  HttpException,
  HttpStatus
} from '@nestjs/common';
import { BookingDocument } from '../Schema/booking.schema';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { Booking } from '../Schema/booking.schema';
import { Court, CourtDocument } from '../Schema/court.schema';
import { CreateBookingDTO } from '../DTO/create-booking.DTO';
import { BookingStatus } from '../Schema/booking.schema';
import { Center } from "../Schema/center.schema";
import { CourtBookingDetail } from 'src/Schema/court-booking-detail.schema';
import { PricingSlot } from 'src/Schema/center-pricing.schema';
import { User } from 'src/Schema/user.schema';
import { startOfDay, endOfDay } from 'date-fns';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { GetHistoryDto } from 'src/DTO/get-history.DTO';
// 1. IMPORT RabbitMQ Connection
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';

const START_HOUR = 5;
const END_HOUR = 24;
const TOTAL_SLOTS = END_HOUR - START_HOUR;

// --- CONFIG RATE LIMIT ---
const MAX_PENDING_SPAM = 3;
const SPAM_WINDOW_SECONDS = 60 * 10;
const SPAM_BAN_DURATION = 30 * 60 * 1000; // 30 phút tính bằng mili-giây

type CreateBookingParams = CreateBookingDTO & { userId: string };

@Injectable()
export class BookingService {
  constructor(
    @InjectQueue('booking-expiration')
    private bookingQueue: Queue,

    @InjectModel(Booking.name)
    private bookingModel: Model<BookingDocument>,

    @InjectModel(Center.name)
    private centerModel: Model<Center>,

    @InjectModel(User.name)
    private userModel: Model<User>,

    @InjectModel(Court.name)
    private courtModel: Model<CourtDocument>,

    @Inject('REDIS_CLIENT') private readonly redisClient: Redis,

    // 2. INJECT RabbitMQ Connection
    private readonly amqpConnection: AmqpConnection
  ) { }

  // ... (Các hàm helper giữ nguyên)
  private isWeekend = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDay();
    return day === 0 || day === 6;
  };

  private parseHour = (timeStr: string) => {
    if (!timeStr) return 0;
    return parseInt(timeStr.split(":")[0], 10);
  };

  private calculatePrice = (center: Center, dateStr: string, slotVal: number) => {
    if (!center || !center.pricing) {
      throw new Error('Center pricing information is missing');
    }

    const dayType = this.isWeekend(dateStr) ? "weekend" : "weekday";
    const pricingList = center.pricing[dayType] || [];

    const matchedPrice = pricingList.find((pricing: PricingSlot) => {
      const start = this.parseHour(pricing.startTime);
      const end = this.parseHour(pricing.endTime);
      return slotVal >= start && slotVal < end;
    });

    return matchedPrice ? matchedPrice.price : 50000;
  };

  private calculateTotalPrice = (user: User, center: Center, dateStr: string, courtBookingDetails: CourtBookingDetail[]) => {
    let basePrice = 0;
    for (const detail of courtBookingDetails) {
      for (const slot of detail.timeslots) {
        basePrice += this.calculatePrice(center, dateStr, slot);
      }
    }
    let discount = 0;
    if (user.points >= 4000) {
      discount = 0.1;
    } else if (user.points >= 2000) {
      discount = 0.05;
    }
    if (courtBookingDetails.length >= 2) {
      discount += 0.05;
    }
    const finalPrice = basePrice * (1 - discount);
    return Math.round(finalPrice);
  }

  // ... (Các hàm find giữ nguyên)
  async findAllBookingsByCenterIdAndDate(centerId: string, bookDate: Date): Promise<Booking[]> {
    return this.bookingModel.find({ centerId, bookDate }).exec();
  }

  async getPendingMappingDB(centerId: string, dateStr: string | Date) {
    const queryDate = new Date(dateStr);
    const start = startOfDay(queryDate);
    const end = endOfDay(queryDate);

    const bookings = await this.bookingModel.find({
      centerId: centerId,
      bookDate: {
        $gte: start,
        $lte: end
      },
      bookingStatus: { $in: ["pending", "confirmed", "processing"] },
      isDeleted: false
    })
      .select('courtBookingDetails bookingStatus userId userName')
      .lean();

    const mapping: Record<string, any[]> = {};

    const getStatusText = (status: string) => {
      switch (status) {
        case 'confirmed': return 'đã đặt';
        case 'pending': return 'pending';
        case 'processing': return 'chờ xử lý';
        default: return 'không xác định';
      }
    };

    bookings.forEach((booking) => {
      const userId = typeof booking.userId === 'object' ? (booking.userId as any)._id : booking.userId;
      const userName = booking.userName || "Unknown";

      booking.courtBookingDetails.forEach((detail) => {
        const courtKey = detail.courtId.toString();

        if (!mapping[courtKey]) {
          mapping[courtKey] = new Array(TOTAL_SLOTS).fill("trống");
        }

        detail.timeslots.forEach((slotHour) => {
          const idx = slotHour - START_HOUR;

          if (idx >= 0 && idx < mapping[courtKey].length) {
            mapping[courtKey][idx] = {
              status: getStatusText(booking.bookingStatus),
              userId: userId,
              name: userName,
              bookingId: booking._id
            };
          }
        });
      });
    });

    return mapping;
  }

  async findConflictingBookings(
    centerId: string,
    bookDate: Date,
    courtBookingDetails: CourtBookingDetail[]
  ): Promise<Booking[]> {
    const courtConflictConditions = courtBookingDetails.map(detail => ({
      courtBookingDetails: {
        $elemMatch: {
          courtId: detail.courtId,
          timeslots: { $in: detail.timeslots },
        },
      },
    }));
    return this.bookingModel.find({
      centerId: centerId,
      bookDate: bookDate,
      bookingStatus: {
        $in: [BookingStatus.PENDING, BookingStatus.PROCESSING, BookingStatus.CONFIRMED]
      },
      $or: courtConflictConditions,
    }).exec();
  }

  // ==================================================================
  // MAIN FUNCTION: CREATE BOOKING
  // ==================================================================
  async createBooking(data: CreateBookingParams): Promise<Booking> {
    const { userId } = data;

    // 1. LẤY THÔNG TIN USER TỪ LOCAL DB
    const user = await this.userModel.findOne({ userId }).exec();
    if (!user) throw new NotFoundException('User not found');

    // ==================================================================
    // 🛑 KHIÊN 1: KIỂM TRA ÁN PHẠT TỪ MONGODB (HỒ SƠ GỐC)
    // (Xử lý các án phạt dài hạn hoặc khi Redis bị mất dữ liệu)
    // ==================================================================
    if (user.isSpamming) {
      const now = new Date();
      const lastSpamTime = new Date(user.lastSpamTime || 0);
      // SPAM_BAN_DURATION = 30 * 60 * 1000
      const releaseTime = new Date(lastSpamTime.getTime() + SPAM_BAN_DURATION);

      // A. Nếu VẪN CÒN trong thời gian phạt
      if (now < releaseTime) {
        const minutesLeft = Math.ceil((releaseTime.getTime() - now.getTime()) / 60000);
        throw new HttpException({
          status: HttpStatus.FORBIDDEN,
          error: `Tài khoản đang bị khóa tạm thời. Vui lòng thử lại sau ${minutesLeft} phút.`,
        }, HttpStatus.FORBIDDEN);
      }

      // B. Nếu ĐÃ HẾT thời gian phạt (Lazy Unban - Cơ chế phòng thủ)
      // (Phòng trường hợp CronJob bên User Service bị lỗi chưa mở khóa kịp)
      else {
        // Mở khóa Local DB ngay lập tức để user không bị chặn oan
        await this.userModel.updateOne({ userId }, {
          $set: { isSpamming: false }
          // Giữ lại lastSpamTime để truy vết lịch sử nếu cần
        });

        // Bắn Event báo User Service biết để đồng bộ lại
        this.amqpConnection.publish('booking_exchange', 'user.spam.cleared', { userId });

        console.log(`[BookingService] Lazy unban triggered for user ${userId}`);
      }
    }

    // ==================================================================
    // 🛑 KHIÊN 2: KIỂM TRA ÁN PHẠT "GĂM HÀNG" TỪ REDIS (TỐC ĐỘ CAO)
    // (Key này do BookingProcessor tạo ra khi phát hiện bùng kèo 3 lần)
    // ==================================================================
    const penaltyKey = `hoarding_penalty:${userId}`;
    const isPenalized = await this.redisClient.get(penaltyKey);

    if (isPenalized) {
      const ttl = await this.redisClient.ttl(penaltyKey);
      throw new HttpException({
        status: HttpStatus.FORBIDDEN,
        error: `Bạn đã giữ chỗ không thanh toán quá nhiều lần. Tính năng đặt sân bị khóa trong ${Math.ceil(ttl / 60)} phút.`,
      }, HttpStatus.FORBIDDEN);
    }

    // ==================================================================
    // ✅ 3. TẠO BOOKING (NẾU SẠCH SẼ)
    // ==================================================================
    const newBooking = new this.bookingModel(data);

    // Check trùng lịch
    const conflicts = await this.findConflictingBookings(
      newBooking.centerId,
      newBooking.bookDate,
      newBooking.courtBookingDetails
    );

    if (conflicts.length > 0) {
      throw new ConflictException('Sân đã có người đặt trong khung giờ này.');
    }

    // Check Center
    const center = await this.centerModel.findOne({ centerId: data.centerId }).exec();
    if (!center) {
      throw new NotFoundException('Center not found');
    }

    // Tính tiền
    let totalPrice = this.calculateTotalPrice(user, center, data.bookDate, newBooking.courtBookingDetails);
    newBooking.price = totalPrice;

    const savedBooking = await newBooking.save();

    // ==================================================================
    // 🕒 4. THÊM VÀO QUEUE ĐỂ CHECK HẾT HẠN (DELAY 5 PHÚT)
    // ==================================================================
    await this.bookingQueue.add(
      'check-expiry',
      {
        bookingId: savedBooking._id.toString(),
        userId: userId // 👈 QUAN TRỌNG: Phải truyền userId để Processor biết ai mà phạt
      },
      {
        delay: 5 * 60 * 1000, // 5 phút
        removeOnComplete: true
      }
    );

    console.log(`Scheduled expiry check for booking ${newBooking._id}`);
    return savedBooking;
  }

  async findAllBookings(): Promise<Booking[]> {
    return this.bookingModel.find().exec();
  }

  async findBookingById(bookingId: string): Promise<Booking | null> {
    return this.bookingModel.findById(bookingId).exec();
  }

  async findAllBookingsByUserId(userId: string): Promise<Booking[]> {
    return this.bookingModel.find({ userId }).exec();
  }

  async updateBookingStatus(bookingId: string, status: BookingStatus): Promise<Booking | null> {
    let objectId;
    try {
      objectId = new mongoose.Types.ObjectId(bookingId);
    } catch (e) {
      throw new BadRequestException('Invalid booking ID format');
    }

    const booking = await this.bookingModel.findById(objectId);
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    booking.bookingStatus = status;
    return booking.save();
  }

  async updateBookingStatusToProcessing(bookingId: string): Promise<Booking | null> {
    const booking = await this.bookingModel.findById(bookingId);
    if (!booking) throw new Error('Booking not found');
    booking.bookingStatus = BookingStatus.PROCESSING;
    return booking.save();
  }

  // ==================================================================
  // 3. LOGIC CẬP NHẬT POINTS & BẮN EVENT RABBITMQ
  // ==================================================================
  async updateBookingStatusToConfirmed(bookingId: string): Promise<Booking | null> {
    const booking = await this.bookingModel.findById(bookingId);
    if (!booking) throw new NotFoundException('Booking not found');

    // 1. Tính điểm (Ví dụ: 1000 VNĐ = 1 điểm)
    const pointsEarned = Math.floor(booking.price / 1000);

    // 2. Cập nhật trạng thái Booking
    booking.bookingStatus = BookingStatus.CONFIRMED;
    booking.pointsEarned = pointsEarned; // Lưu lịch sử điểm vào booking
    await booking.save();

    // 3. Cập nhật Cache User tại BookingService (Để lần sau đặt sân có điểm mới ngay lập tức)
    // Dùng $inc để cộng dồn, an toàn hơn set đè
    await this.userModel.findOneAndUpdate(
      { userId: booking.userId },
      { $inc: { points: pointsEarned } }
    );

    // 4. Bắn Event sang UserService (Source of Truth)
    // Tại UserService, consumer sẽ nhận event này -> cộng điểm -> tính toán Level mới (Vàng/Bạc...)
    try {
      await this.amqpConnection.publish(
        'booking_exchange',   // Tên Exchange (Phải khớp config module)
        'user.points.updated', // Routing Key
        {
          userId: booking.userId,
          pointsToAdd: pointsEarned,
          bookingId: booking._id.toString(),
          source: 'booking_service',
          timestamp: new Date()
        }
      );
      console.log(`[RabbitMQ] Sent user.points.updated for User ${booking.userId}: +${pointsEarned} points`);
    } catch (error) {
      console.error('[RabbitMQ] Error publishing user.points.updated:', error);
      // NOTE: Trong môi trường Production, nên có cơ chế retry hoặc lưu vào Outbox table để gửi lại sau
    }

    return booking;
  }

  async deleteBooking(bookingId: string): Promise<Booking | null> {
    return this.bookingModel.findByIdAndUpdate(
      bookingId,
      { isDeleted: true },
      { new: true },
    ).exec();
  }

  // ... (Hàm getUserBookingHistory giữ nguyên)
  async getUserBookingHistory(userId: string, queryParams: GetHistoryDto) {
    const {
      page = 1,
      limit = 10,
      status,
      centerId,
      dateFrom,
      dateTo,
      search
    } = queryParams;

    const skip = (page - 1) * limit;

    const filter: any = {
      userId,
      isDeleted: false
    };

    if (status && status !== 'all') {
      filter.bookingStatus = (status === 'paid') ? 'confirmed' : status;
    }

    if (centerId && centerId !== 'all') {
      filter.centerId = centerId;
    }

    if (dateFrom || dateTo) {
      filter.bookDate = {};
      if (dateFrom) {
        const start = new Date(dateFrom);
        start.setHours(0, 0, 0, 0);
        filter.bookDate.$gte = start;
      }
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        filter.bookDate.$lte = end;
      }
    }

    if (search) {
      const searchRegex = { $regex: search, $options: 'i' };
      if (search.match(/^[0-9a-fA-F]{24}$/)) {
        filter._id = search;
      } else {
        filter.$or = [
          { centerId: searchRegex },
        ];
      }
    }

    const [totalDocs, bookings] = await Promise.all([
      this.bookingModel.countDocuments(filter),
      this.bookingModel
        .find(filter)
        .sort({ bookDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const centerIds = new Set<string>();
    const courtIds = new Set<string>();

    bookings.forEach(b => {
      if (b.centerId) centerIds.add(b.centerId);
      if (b.courtBookingDetails) {
        b.courtBookingDetails.forEach(detail => {
          if (detail.courtId) courtIds.add(detail.courtId);
        });
      }
    });

    const [centersList, courtsList] = await Promise.all([
      this.centerModel.find({ centerId: { $in: Array.from(centerIds) } }).select('centerId name').lean(),
      this.courtModel.find({ courtId: { $in: Array.from(courtIds) } }).select('courtId name').lean()
    ]);

    const centerMap = new Map<string, string>();
    centersList.forEach((c: any) => centerMap.set(c.centerId, c.name));

    const courtMap = new Map<string, string>();
    courtsList.forEach((c: any) => courtMap.set(c.courtId, c.name));

    const formattedData = bookings.map((booking) => {
      const centerName = centerMap.get(booking.centerId) || booking.centerId;

      const courtTime = booking.courtBookingDetails.map((detail) => {
        const slots = detail.timeslots.sort((a, b) => a - b);
        if (slots.length === 0) return '';
        const start = slots[0];
        const end = slots[slots.length - 1] + 1;
        const courtName = courtMap.get(detail.courtId) || `Sân ${detail.courtId}`;
        return `${courtName}: ${start}:00 - ${end}:00`;
      }).join('\n');

      return {
        bookingId: booking._id,
        orderId: booking._id.toString().slice(-6).toUpperCase(),
        status: booking.bookingStatus,
        center: centerName,
        court_time: courtTime,
        date: booking.bookDate,
        price: booking.price,
        paymentMethod: 'Chuyển khoản / PayOS',
        createdAt: booking['createdAt']
      };
    });

    return {
      bookingHistory: formattedData,
      total: totalDocs,
      totalPages: Math.ceil(totalDocs / limit),
      page,
      limit,
    };
  }

  // ... (Hàm getUserStatistics giữ nguyên)
  async getUserStatistics(userId: string, period: 'week' | 'month' | 'year' = 'month') {
    const now = new Date();
    let startDate = new Date();

    if (period === 'week') {
      startDate.setDate(now.getDate() - 7);
    } else if (period === 'month') {
      startDate.setMonth(now.getMonth() - 1);
    } else if (period === 'year') {
      startDate.setFullYear(now.getFullYear() - 1);
    } else {
      startDate = new Date(now.getFullYear(), 0, 1);
    }

    const user = await this.userModel.findOne({ userId }).lean();
    const currentPoints = user ? user.points : 0;

    const stats = await this.bookingModel.aggregate([
      {
        $match: {
          userId: userId,
          isDeleted: false,
          bookDate: { $gte: startDate, $lte: now }
        }
      },
      {
        $facet: {
          overview: [
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                completed: {
                  $sum: { $cond: [{ $eq: ['$bookingStatus', BookingStatus.CONFIRMED] }, 1, 0] }
                },
                cancelled: {
                  $sum: { $cond: [{ $eq: ['$bookingStatus', BookingStatus.CANCELLED] }, 1, 0] }
                }
              }
            }
          ],
          monthly: [
            {
              $group: {
                _id: { month: { $month: '$bookDate' }, status: '$bookingStatus' },
                count: { $sum: 1 }
              }
            }
          ],
          frequentCenters: [
            {
              $group: {
                _id: '$centerId',
                count: { $sum: 1 },
                lastBooking: { $max: '$bookDate' }
              }
            },
            { $sort: { count: -1 } },
            { $limit: 5 },
            {
              $lookup: {
                from: 'centers',
                localField: '_id',
                foreignField: 'centerId',
                as: 'centerInfo'
              }
            },
            { $unwind: { path: '$centerInfo', preserveNullAndEmptyArrays: true } },
            {
              $project: {
                centerId: '$_id',
                centerName: { $ifNull: ['$centerInfo.name', 'Unknown Center'] },
                bookingCount: '$count'
              }
            }
          ],
          timeDistribution: [
            { $match: { bookingStatus: BookingStatus.CONFIRMED } },
            { $unwind: '$courtBookingDetails' },
            { $unwind: '$courtBookingDetails.timeslots' },
            {
              $group: {
                _id: '$courtBookingDetails.timeslots',
                count: { $sum: 1 }
              }
            },
            { $sort: { count: -1 } }
          ]
        }
      }
    ]);

    const result = stats[0];
    const overviewData = result.overview[0] || { total: 0, completed: 0, cancelled: 0 };
    const processedMonthly = this.processMonthlyStats(result.monthly);
    const timeStats = this.processTimeStats(result.timeDistribution);
    const comparison = {
      totalChange: 12,
      completedChange: 5,
      cancelledChange: -2,
      pointsChange: 10
    };

    return {
      overview: {
        totalBookings: overviewData.total,
        completedBookings: overviewData.completed,
        cancelledBookings: overviewData.cancelled,
        totalPoints: currentPoints,
        completionRate: overviewData.total > 0 ? Math.round((overviewData.completed / overviewData.total) * 100) : 0
      },
      comparison,
      monthlyStats: processedMonthly,
      frequentCenters: result.frequentCenters,
      timeStats
    };
  }

  private processTimeStats(data: any[]) {
    const totalSlots = data.reduce((sum, item) => sum + item.count, 0);
    const distribution = { Sáng: 0, Trưa: 0, Chiều: 0, Tối: 0 };

    data.forEach(item => {
      const h = item._id;
      const c = item.count;
      if (h >= 5 && h <= 11) distribution.Sáng += c;
      else if (h >= 12 && h <= 13) distribution.Trưa += c;
      else if (h >= 14 && h <= 17) distribution.Chiều += c;
      else distribution.Tối += c;
    });

    const mostPopular = data.length > 0 ? data[0] : null;

    return {
      percentages: {
        Sáng: totalSlots ? Math.round((distribution.Sáng / totalSlots) * 100) : 0,
        Trưa: totalSlots ? Math.round((distribution.Trưa / totalSlots) * 100) : 0,
        Chiều: totalSlots ? Math.round((distribution.Chiều / totalSlots) * 100) : 0,
        Tối: totalSlots ? Math.round((distribution.Tối / totalSlots) * 100) : 0,
      },
      popularTimeRange: mostPopular ? `${mostPopular._id}:00 - ${mostPopular._id + 1}:00` : "Chưa có dữ liệu",
      popularCount: mostPopular ? mostPopular.count : 0
    };
  }

  private processMonthlyStats(data: any[]) {
    const map = new Map();
    data.forEach(item => {
      const key = item._id.month;
      if (!map.has(key)) map.set(key, { month: key, completed: 0, cancelled: 0 });
      const entry = map.get(key);
      if (item._id.status === BookingStatus.CONFIRMED) entry.completed = item.count;
      if (item._id.status === BookingStatus.CANCELLED) entry.cancelled = item.count;
    });
    return Array.from(map.values()).sort((a: any, b: any) => a.month - b.month);
  }

  async checkExistsPendingBooking(userId: string, centerId: string): Promise<{ exists: boolean }> {
    console.log(userId, centerId);
    const pendingBooking = await this.bookingModel.findOne({
      userId: userId,
      centerId: centerId,
      bookingStatus: BookingStatus.PENDING, 

    });
    console.log(pendingBooking);
  
    return { exists: !!pendingBooking }; // Trả về true nếu tìm thấy, false nếu không
  }
}