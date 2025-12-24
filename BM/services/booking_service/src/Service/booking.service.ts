import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Inject,
  HttpException,
  HttpStatus
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { startOfDay, endOfDay } from 'date-fns';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';

// --- SCHEMAS ---
import { Booking, BookingDocument, BookingStatus, BookingType } from '../Schema/booking.schema';
import { Court, CourtDocument } from '../Schema/court.schema';
import { Center } from "../Schema/center.schema";
import { User } from 'src/Schema/user.schema';
import { CourtBookingDetail } from 'src/Schema/court-booking-detail.schema';
import { PricingSlot } from 'src/Schema/center-pricing.schema';

// --- DTOs ---
import { CreateBookingDTO } from '../DTO/create-booking.DTO';
import { GetHistoryDto } from 'src/DTO/get-history.DTO';

const START_HOUR = 5;
const END_HOUR = 24;
const TOTAL_SLOTS = END_HOUR - START_HOUR;

// --- CONFIG RATE LIMIT ---
const SPAM_BAN_DURATION = 30 * 60 * 1000; // 30 phút

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

    private readonly amqpConnection: AmqpConnection
  ) { }

  // ==================================================================
  // 🛠 HELPER FUNCTIONS
  // ==================================================================

  private isWeekend = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDay();
    return day === 0 || day === 6;
  };

  private parseHour = (timeStr: string) => {
    if (!timeStr) return 0;
    return parseInt(timeStr.split(":")[0], 10);
  };

  // Tính giá từng slot lẻ
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

  // Tính tổng tiền (bao gồm Discount dựa trên điểm User)
  private calculateTotalPrice = (user: User, center: Center, dateStr: string, courtBookingDetails: CourtBookingDetail[]) => {
    let basePrice = 0;
    for (const detail of courtBookingDetails) {
      for (const slot of detail.timeslots) {
        basePrice += this.calculatePrice(center, dateStr, slot);
      }
    }

    // Logic giảm giá
    let discount = 0;
    if (user.points >= 4000) {
      discount = 0.1;
    } else if (user.points >= 2000) {
      discount = 0.05;
    }
    // Giảm thêm nếu đặt nhiều sân cùng lúc (tuỳ logic business)
    if (courtBookingDetails.length >= 2) {
      discount += 0.05;
    }

    const finalPrice = basePrice * (1 - discount);
    return Math.round(finalPrice);
  }

  // ==================================================================
  // 🔍 FIND & CHECK FUNCTIONS
  // ==================================================================

  async findConflictingBookings(
    centerId: string,
    bookDate: Date,
    courtBookingDetails: CourtBookingDetail[]
  ): Promise<Booking[]> {
    // Tạo điều kiện query động cho từng sân và khung giờ
    const courtConflictConditions = courtBookingDetails.map(detail => ({
      courtBookingDetails: {
        $elemMatch: {
          courtId: detail.courtId,
          // Kiểm tra giao thoa mảng timeslots. 
          timeslots: { $in: detail.timeslots },
        },
      },
    }));

    return this.bookingModel.find({
      centerId: centerId,
      bookDate: {
        $gte: startOfDay(bookDate),
        $lte: endOfDay(bookDate)
      },
      bookingStatus: {
        $in: [BookingStatus.PENDING, BookingStatus.PROCESSING, BookingStatus.CONFIRMED]
      },
      isDeleted: false,
      $or: courtConflictConditions,
    }).exec();
  }

  // ==================================================================
  // ✅ 1. CREATE BOOKING (DAILY - STANDARD)
  // ==================================================================
  async createBooking(data: CreateBookingParams): Promise<Booking> {
    const { userId } = data;

    // 1. Validate User
    const user = await this.userModel.findOne({ userId }).exec();
    if (!user) throw new NotFoundException('User not found');

    // 2. Check Spam (Local DB)
    if (user.isSpamming) {
      const now = new Date();
      const lastSpamTime = new Date(user.lastSpamTime || 0);
      const releaseTime = new Date(lastSpamTime.getTime() + SPAM_BAN_DURATION);

      if (now < releaseTime) {
        const minutesLeft = Math.ceil((releaseTime.getTime() - now.getTime()) / 60000);
        throw new HttpException({
          status: HttpStatus.FORBIDDEN,
          error: `Tài khoản bị khóa tạm thời. Thử lại sau ${minutesLeft} phút.`,
        }, HttpStatus.FORBIDDEN);
      } else {
        // Lazy Unban
        await this.userModel.updateOne({ userId }, { $set: { isSpamming: false } });
        this.amqpConnection.publish('booking_exchange', 'user.spam.cleared', { userId });
      }
    }

    // 3. Check Redis Penalty
    const penaltyKey = `hoarding_penalty:${userId}`;
    const isPenalized = await this.redisClient.get(penaltyKey);
    if (isPenalized) {
      const ttl = await this.redisClient.ttl(penaltyKey);
      throw new HttpException({
        status: HttpStatus.FORBIDDEN,
        error: `Bạn bị khóa tính năng đặt sân trong ${Math.ceil(ttl / 60)} phút do giữ chỗ quá nhiều.`,
      }, HttpStatus.FORBIDDEN);
    }

    // 4. Create Instance
    const newBooking = new this.bookingModel(data);
    newBooking.bookDate = new Date(data.bookDate);
    // 🟢 Cập nhật userName từ schema mới
    newBooking.userName = user.name || "Unknown";

    // 5. Check Conflict
    const conflicts = await this.findConflictingBookings(
      newBooking.centerId,
      newBooking.bookDate,
      newBooking.courtBookingDetails
    );

    if (conflicts.length > 0) {
      throw new ConflictException('Sân đã có người đặt trong khung giờ này.');
    }

    // 6. Get Center & Calc Price
    const center = await this.centerModel.findOne({ centerId: data.centerId }).exec();
    if (!center) throw new NotFoundException('Center not found');

    newBooking.price = this.calculateTotalPrice(user, center, data.bookDate.toString(), newBooking.courtBookingDetails);

    // 7. Save & Queue
    const savedBooking = await newBooking.save();

    await this.bookingQueue.add('check-expiry', {
      bookingId: savedBooking._id.toString(),
      userId: userId
    }, { delay: 5 * 60 * 1000, removeOnComplete: true }
    );

    return savedBooking;
  }

  // ==================================================================
  // ✅ 2. CREATE FIXED BOOKINGS (BATCH - MONTHLY)
  // ==================================================================
  async createFixedBookings(payload: {
    userId: string;
    centerId: string;
    bookings: {
      date: string;
      courtId: string;
      timeslots: number[];
    }[];
  }): Promise<BookingDocument[]> {
    const { userId, centerId, bookings } = payload;

    // A. Validate User & Center
    const [user, center] = await Promise.all([
      this.userModel.findOne({ userId }).exec(),
      this.centerModel.findOne({ centerId }).exec()
    ]);

    if (!user) throw new NotFoundException('User not found');
    if (!center) throw new NotFoundException('Center not found');

    const bookingDocuments: any[] = [];
    let totalBatchPoints = 0;
    
    // 🟢 Thời điểm hiện tại để check quá khứ
    const now = new Date();

    // B. Process each booking request
    for (const req of bookings) {
      if (!req.timeslots || req.timeslots.length === 0) {
        continue;
      }

      const bookDate = new Date(req.date);

      // 🟢 1. LỌC TIMESLOTS Ở BACKEND (Chốt chặn an toàn)
      const validTimeslots = req.timeslots.filter(slot => {
           const slotTime = new Date(bookDate);
           slotTime.setHours(slot, 0, 0, 0);
           return slotTime > now; // Chỉ nhận slot ở tương lai
      });

      // Nếu sau khi lọc mà hết giờ -> Bỏ qua ngày này
      if (validTimeslots.length === 0) {
           continue; 
      }

      // C. Validate Court
      const court = await this.courtModel.findOne({
        courtId: req.courtId,
        centerId: centerId
      }).exec();

      if (!court) {
        throw new BadRequestException(`Sân ${req.courtId} không thuộc trung tâm này.`);
      }

      // D. Construct Booking Detail (Dùng validTimeslots)
      const sortedSlots = validTimeslots.sort((a, b) => a - b);
      const courtBookingDetail: CourtBookingDetail = {
        courtId: req.courtId,
        timeslots: sortedSlots,
      };

      // E. Check Conflict
      const conflicts = await this.findConflictingBookings(
        centerId,
        bookDate,
        [courtBookingDetail]
      );

      if (conflicts.length > 0) {
        throw new ConflictException(
          `Xung đột lịch: Ngày ${bookDate.toLocaleDateString('vi-VN')} tại sân ${court.name} đã bị đặt.`
        );
      }

      // F. Calculate Price
      const price = this.calculateTotalPrice(
        user,
        center,
        req.date,
        [courtBookingDetail]
      );

      const points = Math.floor(price / 1000);
      totalBatchPoints += points;

      // H. Push to array
      bookingDocuments.push({
        userId: userId,
        userName: user.name || "Unknown",
        centerId: center.centerId,
        courtBookingDetails: [courtBookingDetail],
        bookDate: bookDate,
        bookingStatus: BookingStatus.CONFIRMED,
        bookingType: BookingType.MONTHLY,
        price: price,
        isDeleted: false,
        note: `Đặt lịch cố định (${court.name})`,
        paymentImageUrl: "",
        pointsEarned: points
      });
    }

    // Nếu không còn booking nào hợp lệ (tất cả đều quá khứ) -> Return mảng rỗng
    if (bookingDocuments.length === 0) {
        return [] as unknown as BookingDocument[];
    }

    // I. Batch Insert
    const createdBookings = await this.bookingModel.insertMany(bookingDocuments);

    // ==================================================================
    // 🟢 SYNC POINTS
    // ==================================================================
    if (totalBatchPoints > 0 && createdBookings.length > 0) {
      await this.userModel.updateOne(
        { userId: userId },
        { $inc: { points: totalBatchPoints } }
      );

      try {
        const refBookingId = createdBookings[0]._id.toString();
        await this.amqpConnection.publish(
          'booking_exchange',
          'user.points.updated',
          {
            userId: userId,
            pointsToAdd: totalBatchPoints,
            bookingId: refBookingId,
            source: 'booking_service',
            reason: 'fixed_booking_batch',
            timestamp: new Date()
          }
        );
      } catch (error) {
        console.error('[RabbitMQ] Failed to publish fixed booking points:', error);
      }
    }

    return createdBookings as unknown as BookingDocument[];
  }

  // ==================================================================
  // 🔄 UPDATE STATUS & RABBITMQ
  // ==================================================================

  async updateBookingStatusToConfirmed(bookingId: string): Promise<Booking | null> {
    const booking = await this.bookingModel.findById(bookingId);
    if (!booking) throw new NotFoundException('Booking not found');

    // 1. Calculate Points
    const pointsEarned = Math.floor(booking.price / 1000);

    // 2. Update Booking
    booking.bookingStatus = BookingStatus.CONFIRMED;
    booking.pointsEarned = pointsEarned;
    await booking.save();

    // 3. Update User Cache (Atomic update)
    await this.userModel.findOneAndUpdate(
      { userId: booking.userId },
      { $inc: { points: pointsEarned } }
    );

    // 4. Publish Event to RabbitMQ
    try {
      await this.amqpConnection.publish(
        'booking_exchange',
        'user.points.updated',
        {
          userId: booking.userId,
          pointsToAdd: pointsEarned,
          bookingId: booking._id.toString(),
          source: 'booking_service',
          timestamp: new Date()
        }
      );
      console.log(`[RabbitMQ] Published user.points.updated: User ${booking.userId} +${pointsEarned}`);
    } catch (error) {
      console.error('[RabbitMQ] Publish error:', error);
    }

    return booking;
  }

  async updateBookingStatus(bookingId: string, status: BookingStatus): Promise<Booking | null> {
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      throw new BadRequestException('Invalid booking ID');
    }
    const booking = await this.bookingModel.findById(bookingId);
    if (!booking) throw new NotFoundException('Booking not found');

    booking.bookingStatus = status;
    return booking.save();
  }

  // ==================================================================
  // 📊 QUERY & STATS API
  // ==================================================================

  async findAllBookings(): Promise<Booking[]> {
    return this.bookingModel.find().exec();
  }

  async findBookingById(bookingId: string): Promise<Booking | null> {
    return this.bookingModel.findById(bookingId).exec();
  }

  async findAllBookingsByUserId(userId: string): Promise<Booking[]> {
    return this.bookingModel.find({ userId }).exec();
  }

  async deleteBooking(bookingId: string): Promise<Booking | null> {
    return this.bookingModel.findByIdAndUpdate(
      bookingId,
      { isDeleted: true },
      { new: true },
    ).exec();
  }

  async getPendingMappingDB(centerId: string, dateStr: string | Date) {
    const queryDate = new Date(dateStr);
    const start = startOfDay(queryDate);
    const end = endOfDay(queryDate);

    const bookings = await this.bookingModel.find({
      centerId: centerId,
      bookDate: { $gte: start, $lte: end },
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

  // --- ADMIN FILTER ---
  async getAllBookingsForAdmin(query: any) {
    const { page = 1, limit = 10, status, type, centerId, date } = query;
    const skip = (Number(page) - 1) * Number(limit);
    const filter: any = {};

    if (status && status !== '') filter.bookingStatus = status;
    if (type && type !== 'all') filter.bookingType = type;
    if (centerId && centerId !== '') filter.centerId = centerId;

    if (date) {
      const searchDate = new Date(date);
      if (!isNaN(searchDate.getTime())) {
        filter.createdAt = {
          $gte: startOfDay(searchDate),
          $lte: endOfDay(searchDate)
        };
      }
    }

    const [data, total] = await Promise.all([
      this.bookingModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).exec(),
      this.bookingModel.countDocuments(filter).exec(),
    ]);

    return {
      data,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    };
  }

  // --- USER HISTORY ---
  async getUserBookingHistory(userId: string, queryParams: GetHistoryDto) {
    const { page = 1, limit = 10, status, centerId, dateFrom, dateTo, search } = queryParams;
    const skip = (page - 1) * limit;
    const filter: any = { userId, isDeleted: false };

    if (status && status !== 'all') filter.bookingStatus = (status === 'paid') ? 'confirmed' : status;
    if (centerId && centerId !== 'all') filter.centerId = centerId;

    if (dateFrom || dateTo) {
      filter.bookDate = {};
      if (dateFrom) filter.bookDate.$gte = startOfDay(new Date(dateFrom));
      if (dateTo) filter.bookDate.$lte = endOfDay(new Date(dateTo));
    }

    if (search) {
      if (search.match(/^[0-9a-fA-F]{24}$/)) filter._id = search;
    }

    const [totalDocs, bookings] = await Promise.all([
      this.bookingModel.countDocuments(filter),
      this.bookingModel.find(filter).sort({ bookDate: -1, createdAt: -1 }).skip(skip).limit(limit).lean(),
    ]);

    const centerIds = [...new Set(bookings.map(b => b.centerId))];
    const courtIds = [...new Set(bookings.flatMap(b => b.courtBookingDetails.map(d => d.courtId)))];

    const [centersList, courtsList] = await Promise.all([
      this.centerModel.find({ centerId: { $in: centerIds } }).select('centerId name').lean(),
      this.courtModel.find({ courtId: { $in: courtIds } }).select('courtId name').lean()
    ]);

    const centerMap = new Map(centersList.map((c: any) => [c.centerId, c.name]));
    const courtMap = new Map(courtsList.map((c: any) => [c.courtId, c.name]));

    const formattedData = bookings.map((booking) => {
      const courtTime = booking.courtBookingDetails.map(detail => {
        const slots = detail.timeslots.sort((a, b) => a - b);
        if (!slots.length) return '';
        const cName = courtMap.get(detail.courtId) || `Sân ${detail.courtId}`;
        return `${cName}: ${slots[0]}:00 - ${slots[slots.length - 1] + 1}:00`;
      }).join('\n');

      return {
        bookingId: booking._id,
        orderId: booking._id.toString().slice(-6).toUpperCase(),
        status: booking.bookingStatus,
        center: centerMap.get(booking.centerId) || booking.centerId,
        court_time: courtTime,
        date: booking.bookDate,
        price: booking.price,
        paymentMethod: 'Chuyển khoản / PayOS',
        createdAt: booking['createdAt']
      };
    });

    return { bookingHistory: formattedData, total: totalDocs, totalPages: Math.ceil(totalDocs / limit), page, limit };
  }

  // --- STATISTICS ---
  async getUserStatistics(userId: string, period: 'week' | 'month' | 'year' = 'month') {
    const now = new Date();
    let startDate = new Date();
    if (period === 'week') startDate.setDate(now.getDate() - 7);
    else if (period === 'month') startDate.setMonth(now.getMonth() - 1);
    else if (period === 'year') startDate.setFullYear(now.getFullYear() - 1);
    else startDate = new Date(now.getFullYear(), 0, 1);

    const user = await this.userModel.findOne({ userId }).lean();
    const currentPoints = user ? user.points : 0;

    const stats = await this.bookingModel.aggregate([
      { $match: { userId, isDeleted: false, bookDate: { $gte: startDate, $lte: now } } },
      {
        $facet: {
          overview: [
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                completed: { $sum: { $cond: [{ $eq: ['$bookingStatus', BookingStatus.CONFIRMED] }, 1, 0] } },
                cancelled: { $sum: { $cond: [{ $eq: ['$bookingStatus', BookingStatus.CANCELLED] }, 1, 0] } }
              }
            }
          ],
          monthly: [
            { $group: { _id: { month: { $month: '$bookDate' }, status: '$bookingStatus' }, count: { $sum: 1 } } }
          ],
          frequentCenters: [
            { $group: { _id: '$centerId', count: { $sum: 1 }, lastBooking: { $max: '$bookDate' } } },
            { $sort: { count: -1 } },
            { $limit: 5 },
            { $lookup: { from: 'centers', localField: '_id', foreignField: 'centerId', as: 'centerInfo' } },
            { $unwind: { path: '$centerInfo', preserveNullAndEmptyArrays: true } },
            { $project: { centerId: '$_id', centerName: { $ifNull: ['$centerInfo.name', 'Unknown Center'] }, bookingCount: '$count' } }
          ],
          timeDistribution: [
            { $match: { bookingStatus: BookingStatus.CONFIRMED } },
            { $unwind: '$courtBookingDetails' },
            { $unwind: '$courtBookingDetails.timeslots' },
            { $group: { _id: '$courtBookingDetails.timeslots', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
          ]
        }
      }
    ]);

    const result = stats[0];
    const overviewData = result.overview[0] || { total: 0, completed: 0, cancelled: 0 };

    return {
      overview: {
        totalBookings: overviewData.total,
        completedBookings: overviewData.completed,
        cancelledBookings: overviewData.cancelled,
        totalPoints: currentPoints,
        completionRate: overviewData.total > 0 ? Math.round((overviewData.completed / overviewData.total) * 100) : 0
      },
      comparison: { totalChange: 12, completedChange: 5, cancelledChange: -2, pointsChange: 10 },
      monthlyStats: this.processMonthlyStats(result.monthly),
      frequentCenters: result.frequentCenters,
      timeStats: this.processTimeStats(result.timeDistribution)
    };
  }

  private processTimeStats(data: any[]) {
    const totalSlots = data.reduce((sum, item) => sum + item.count, 0);
    const distribution = { Sáng: 0, Trưa: 0, Chiều: 0, Tối: 0 };
    data.forEach(item => {
      const h = item._id; const c = item.count;
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
    const pendingBooking = await this.bookingModel.findOne({
      userId: userId,
      centerId: centerId,
      bookingStatus: BookingStatus.PENDING,
    });
    return { exists: !!pendingBooking };
  }

  // ==================================================================
  // ✅ CHECK AVAILABLE COURTS FOR FIXED BOOKING (FINAL FIX)
  // ==================================================================
  async checkAvailableCourtsForFixed(payload: {
    centerId: string;
    startDate: string | Date; // Hỗ trợ cả string và Date
    daysOfWeek: number[];
    timeslots: string[];
  }) {
    const { centerId, startDate, daysOfWeek, timeslots } = payload;

    // 1. Parse Timeslots
    const slotNumbers = timeslots.map((t) => parseInt(t.split(':')[0], 10));
    if (slotNumbers.length === 0) return {};

    // 2. Xác định khoảng thời gian cần check (Start -> End + 30 ngày)
    const startRange = new Date(startDate);
    startRange.setUTCHours(0, 0, 0, 0);

    const endRange = new Date(startRange);
    endRange.setDate(endRange.getDate() + 30);
    endRange.setUTCHours(23, 59, 59, 999);

    // 3. Chạy song song 2 Query
    const [allCourts, potentialConflicts] = await Promise.all([
      // Query 1: Lấy danh sách sân
      this.courtModel.find({ centerId }).select('courtId name').lean().exec(),

      // Query 2: Lấy booking trong khoảng thời gian (Dùng Range Query thay vì $in phức tạp)
      this.bookingModel
        .find({
          centerId,
          bookDate: {
            $gte: startRange,
            $lte: endRange,
          },
          bookingStatus: {
            $in: [
              BookingStatus.PENDING,
              BookingStatus.CONFIRMED,
              BookingStatus.PROCESSING,
            ],
          },
          isDeleted: false,
          courtBookingDetails: {
            $elemMatch: {
              timeslots: { $in: slotNumbers },
            },
          },
        })
        .select('courtBookingDetails bookDate')
        .lean()
        .exec(),
    ]);

    if (!allCourts || allCourts.length === 0) return {};

    // 4. Xử lý Logic tìm sân trống (In-Memory)
    
    // Helper: Chuyển Date sang string YYYY-MM-DD chuẩn
    const toDateKey = (d: Date | string) => {
      const dateObj = new Date(d);
      // Sử dụng UTC để tránh lệch múi giờ
      const year = dateObj.getUTCFullYear();
      const month = dateObj.getUTCMonth() + 1;
      const day = dateObj.getUTCDate();
      return `${year}-${month}-${day}`;
    };

    // Tạo Map: Key là "YYYY-MM-DD" -> Value là Set chứa các CourtId bị bận
    const conflictMap = new Map<string, Set<string>>();

    potentialConflicts.forEach((booking) => {
      const dateKey = toDateKey(booking.bookDate);

      // --- FIX LỖI OBJECT POSSIBLY UNDEFINED Ở ĐÂY ---
      let busySet = conflictMap.get(dateKey);
      if (!busySet) {
        busySet = new Set<string>();
        conflictMap.set(dateKey, busySet);
      }

      // Check overlap
      if (booking.courtBookingDetails && Array.isArray(booking.courtBookingDetails)) {
        booking.courtBookingDetails.forEach((detail) => {
          const hasOverlap = detail.timeslots.some((slot) =>
            slotNumbers.includes(slot),
          );
          if (hasOverlap) {
            busySet!.add(detail.courtId); // Dấu ! khẳng định busySet không null
          }
        });
      }
    });

    const result: Record<number, any[]> = {};

    // 5. Duyệt qua từng thứ khách chọn
    for (const dayOfWeek of daysOfWeek) {
      const targetDates: string[] = [];
      let current = new Date(startRange);

      // Tạo danh sách các ngày (YYYY-MM-DD) tương ứng với thứ trong tuần
      while (current <= endRange) {
        if (current.getDay() === dayOfWeek) {
          targetDates.push(toDateKey(current));
        }
        current.setDate(current.getDate() + 1);
      }

      if (targetDates.length === 0) {
        result[dayOfWeek] = [];
        continue;
      }

      // Logic: Sân bị coi là BẬN nếu nó bận ở BẤT KỲ ngày nào trong chuỗi cố định
      const busyCourtIds = new Set<string>();

      targetDates.forEach((dateKey) => {
        const conflictsOnDate = conflictMap.get(dateKey);
        if (conflictsOnDate) {
          conflictsOnDate.forEach((courtId) => busyCourtIds.add(courtId));
        }
      });

      // Lọc sân trống
      const availableCourts = allCourts.filter(
        (court) => !busyCourtIds.has(court.courtId),
      );

      result[dayOfWeek] = availableCourts;
    }

    return result;
  }
}