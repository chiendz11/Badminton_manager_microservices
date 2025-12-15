import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { BookingDocument } from '../Schema/booking.schema';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { Booking } from '../Schema/booking.schema';
import { Court, CourtDocument } from '../Schema/court.schema'; // Đảm bảo đường dẫn đúng
import { CreateBookingDTO } from '../DTO/create-booking.DTO';
import { BookingStatus } from '../Schema/booking.schema';
import { Center } from "../Schema/center.schema";
import { CourtBookingDetail } from 'src/Schema/court-booking-detail.schema';
import { PricingSlot } from 'src/Schema/center-pricing.schema';
import { User } from 'src/Schema/user.schema';
import { startOfDay, endOfDay } from 'date-fns'
import { InjectQueue } from '@nestjs/bullmq';
import { deprecate } from 'util';

import { GetHistoryDto } from 'src/DTO/get-history.DTO';

const START_HOUR = 5; // e.g., 5 AM
const END_HOUR = 24;  // e.g., 10 PM
const TOTAL_SLOTS = END_HOUR - START_HOUR;
type CreateBookingParams = CreateBookingDTO & { userId: string };

@Injectable()
export class BookingService {
  constructor(
    @InjectQueue('booking-expiration')
    private bookingQueue: any,
    @InjectModel(Booking.name)
    private bookingModel: Model<BookingDocument>,
    @InjectModel(Center.name)
    private centerModel: Model<Center>,
    @InjectModel(User.name)
    private userModel: Model<User>,
    @InjectModel(Court.name)
    private courtModel: Model<CourtDocument>,
  ) { }

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

  async findAllBookingsByCenterIdAndDate(centerId: string, bookDate: Date): Promise<Booking[]> {
    return this.bookingModel.find({ centerId, bookDate }).exec();
  }

  async getPendingMappingDB(centerId: string, dateStr: string | Date) {
    // 1. Standardize Date (Start of Day to End of Day)
    // Using helper library ensures we cover 00:00:00 to 23:59:59 correctly
    const queryDate = new Date(dateStr);
    const start = startOfDay(queryDate);
    const end = endOfDay(queryDate);

    // 2. Query DB
    const bookings = await this.bookingModel.find({
      centerId: centerId, // Assuming centerId is stored as String or ObjectId
      bookDate: {         // Note: Your schema used 'bookDate', snippet used 'date'
        $gte: start,
        $lte: end
      },
      bookingStatus: { $in: ["pending", "confirmed", "processing"] }, // Updated to match your Enum
      isDeleted: false
    })
      .select('courtBookingDetails bookingStatus userId userName') // Fetch only what we need
      .lean();

    // 3. Initialize Mapping
    // Result type: { [courtId: string]: Array<SlotInfo> }
    const mapping: Record<string, any[]> = {};

    // 4. Helper for Status Text
    const getStatusText = (status: string) => {
      switch (status) {
        case 'confirmed': return 'đã đặt';
        case 'pending': return 'pending';
        case 'processing': return 'chờ xử lý';
        default: return 'không xác định';
      }
    };

    // 5. Process Bookings
    bookings.forEach((booking) => {
      // Handle User Info (Support both populated object or raw string)
      const userId = typeof booking.userId === 'object' ? (booking.userId as any)._id : booking.userId;
      const userName = booking.userName || "Unknown";

      // Loop through court details
      booking.courtBookingDetails.forEach((detail) => {
        const courtKey = detail.courtId.toString();

        // Initialize court array if not exists
        if (!mapping[courtKey]) {
          mapping[courtKey] = new Array(TOTAL_SLOTS).fill("trống");
        }

        // Fill slots
        detail.timeslots.forEach((slotHour) => {
          // Calculation: If slot is 17 (5PM) and Start Hour is 5, index is 12.
          // Adjust logic based on how your 'TIMES' array was structured.
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

  async createBooking(data: CreateBookingParams): Promise<Booking> {
    const newBooking = new this.bookingModel(data);

    const conflicts = await this.findConflictingBookings(
      newBooking.centerId,
      newBooking.bookDate,
      newBooking.courtBookingDetails
    );

    if (conflicts.length > 0) {
      throw new ConflictException('Booking conflict detected for the selected courts and timeslots');
    }

    const center = await this.centerModel.findOne({ centerId: data.centerId }).exec();
    if (!center) {
      throw new NotFoundException('Center not found');
    }
    const user = await this.userModel.findOne({ userId: data.userId }).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    let totalPrice = this.calculateTotalPrice(user, center, data.bookDate, newBooking.courtBookingDetails);
    newBooking.price = totalPrice;
    const savedBooking = await newBooking.save();

    await this.bookingQueue.add(
      'check-expiry',
      {
        bookingId: newBooking._id.toString()
      },
      {
        delay: 5 * 60 * 1000,
        removeOnComplete: true
      }
    );

    console.log(`Scheduled auto-cancel for booking ${newBooking._id} in 5 minutes`);
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

    // 1. Kiểm tra và Chuyển đổi sang ObjectId
    try {
      objectId = new mongoose.Types.ObjectId(bookingId);
    } catch (e) {
      // Xử lý lỗi nếu chuỗi bookingId không phải là ObjectId hợp lệ (Fail Fast)
      throw new BadRequestException('Invalid booking ID format');
    }

    // 2. Sử dụng ObjectId để truy vấn
    const booking = await this.bookingModel.findById(objectId);
    // HOẶC: const booking = await this.bookingModel.findOne({ _id: objectId });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    booking.bookingStatus = status;
    return booking.save();
  }

  /**
   * @deprecated Use updateBookingStatus with BookingStatus.PROCESSING instead
   */
  async updateBookingStatusToProcessing(bookingId: string): Promise<Booking | null> {
    const booking = await this.bookingModel.findById(bookingId);

    if (!booking) {
      throw new Error('Booking not found');
    }

    booking.bookingStatus = BookingStatus.PROCESSING;
    return booking.save();
  }

  /**
   * @deprecated Use updateBookingStatus with BookingStatus.CONFIRMED instead
   */
  async updateBookingStatusToConfirmed(bookingId: string): Promise<Booking | null> {
    const booking = await this.bookingModel.findById(bookingId);

    if (!booking) {
      return null;
    }

    booking.bookingStatus = BookingStatus.CONFIRMED;
    booking.pointsEarned = Math.floor(booking.price / 1000);
    return booking.save();
  }

  async deleteBooking(bookingId: string): Promise<Booking | null> {
    return this.bookingModel.findByIdAndUpdate(
      bookingId,
      { isDeleted: true },
      { new: true },
    ).exec();
  }

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

    // 1. Xây dựng Filter
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

    // 2. Query DB Booking
    const [totalDocs, bookings] = await Promise.all([
      this.bookingModel.countDocuments(filter),
      this.bookingModel
        .find(filter)
        .sort({ bookDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    // ==========================================================
    // 🚀 TỐI ƯU HIỆU NĂNG: Lấy dữ liệu liên quan (Center & Court)
    // ==========================================================

    // B1: Gom tất cả ID cần thiết
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

    // B2: Query 1 lần duy nhất vào Collection Center và Court
    // (Nhanh hơn việc gọi findOne trong vòng lặp map)
    const [centersList, courtsList] = await Promise.all([
      this.centerModel.find({ centerId: { $in: Array.from(centerIds) } }).select('centerId name').lean(),
      this.courtModel.find({ courtId: { $in: Array.from(courtIds) } }).select('courtId name').lean() // Lấy tên sân
    ]);

    // B3: Tạo Map để tra cứu nhanh
    const centerMap = new Map<string, string>();
    centersList.forEach((c: any) => centerMap.set(c.centerId, c.name));

    const courtMap = new Map<string, string>();
    courtsList.forEach((c: any) => courtMap.set(c.courtId, c.name));


    // 3. Format dữ liệu trả về
    const formattedData = bookings.map((booking) => {
      // a. Lấy tên Center từ Map
      const centerName = centerMap.get(booking.centerId) || booking.centerId;

      // b. Format Giờ chơi (Lookup tên Court từ Map)
      const courtTime = booking.courtBookingDetails.map((detail) => {
        const slots = detail.timeslots.sort((a, b) => a - b);
        if (slots.length === 0) return '';

        const start = slots[0];
        const end = slots[slots.length - 1] + 1;

        // 👇 LOGIC MỚI: Lấy tên sân từ Map, nếu không có thì fallback về ID
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

    // 4. Return
    return {
      bookingHistory: formattedData,
      total: totalDocs,
      totalPages: Math.ceil(totalDocs / limit),
      page,
      limit,
    };
  }

  async getUserStatistics(userId: string, period: 'week' | 'month' | 'year' = 'month') {
    // 1. Xác định khoảng thời gian lọc
    const now = new Date();
    let startDate = new Date();

    if (period === 'week') {
      startDate.setDate(now.getDate() - 7);
    } else if (period === 'month') {
      startDate.setMonth(now.getMonth() - 1);
    } else if (period === 'year') {
      startDate.setFullYear(now.getFullYear() - 1);
    } else {
      // Mặc định lấy từ đầu năm nay
      startDate = new Date(now.getFullYear(), 0, 1);
    }

    // Lấy điểm hiện tại của user (để hiển thị ở overview)
    const user = await this.userModel.findOne({ userId }).lean();
    const currentPoints = user ? user.points : 0;

    // 2. Thực hiện Aggregation Pipeline
    const stats = await this.bookingModel.aggregate([
      {
        $match: {
          userId: userId,
          isDeleted: false,
          // Chỉ lấy dữ liệu trong khoảng thời gian đã chọn (hoặc bỏ dòng này nếu muốn tính all time cho overview)
          bookDate: { $gte: startDate, $lte: now }
        }
      },
      {
        $facet: {
          // --- A. TỔNG QUAN (Overview) ---
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

          // --- B. BIỂU ĐỒ THEO THÁNG (Chart) ---
          monthly: [
            {
              $group: {
                _id: { month: { $month: '$bookDate' }, status: '$bookingStatus' },
                count: { $sum: 1 }
              }
            }
          ],

          // --- C. CƠ SỞ HAY ĐẶT (Frequent Centers) ---
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
            // Lookup sang collection centers để lấy tên (Giả sử collection tên là 'centers')
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

          // --- D. KHUNG GIỜ PHỔ BIẾN (Time Slots) ---
          // Chỉ tính các đơn đã hoàn thành để chính xác
          timeDistribution: [
            { $match: { bookingStatus: BookingStatus.CONFIRMED } },
            { $unwind: '$courtBookingDetails' }, // Bung mảng chi tiết sân
            { $unwind: '$courtBookingDetails.timeslots' }, // Bung mảng giờ
            {
              $group: {
                _id: '$courtBookingDetails.timeslots', // Group theo giờ (5, 6... 18, 19)
                count: { $sum: 1 }
              }
            },
            { $sort: { count: -1 } } // Sắp xếp giờ nào đặt nhiều nhất lên đầu
          ]
        }
      }
    ]);

    const result = stats[0];
    const overviewData = result.overview[0] || { total: 0, completed: 0, cancelled: 0 };

    // 3. Xử lý hậu kỳ dữ liệu (Post-processing)

    // Xử lý dữ liệu biểu đồ (Map ra 12 tháng hoặc range tùy ý)
    const processedMonthly = this.processMonthlyStats(result.monthly);

    // Xử lý dữ liệu Giờ (Tính %)
    const timeStats = this.processTimeStats(result.timeDistribution);

    // Xử lý so sánh tăng giảm (Giả lập logic, hoặc cần query thêm kỳ trước để tính)
    const comparison = {
      totalChange: 12, // Ví dụ: hardcode hoặc tính toán thật
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
      timeStats // Trả về object đã tính toán %
    };
  }

  // --- Helper: Xử lý Time Distribution ---
  private processTimeStats(data: any[]) {
    const totalSlots = data.reduce((sum, item) => sum + item.count, 0);

    const distribution = { Sáng: 0, Trưa: 0, Chiều: 0, Tối: 0 };

    data.forEach(item => {
      const h = item._id; // Giờ (number)
      const c = item.count;
      if (h >= 5 && h <= 11) distribution.Sáng += c;
      else if (h >= 12 && h <= 13) distribution.Trưa += c;
      else if (h >= 14 && h <= 17) distribution.Chiều += c;
      else distribution.Tối += c;
    });

    // Tìm giờ phổ biến nhất
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

  // --- Helper: Map Monthly Data ---
  private processMonthlyStats(data: any[]) {
    // Logic map array mongo result sang mảng chuẩn UI (VD: T1 -> T12)
    // Code rút gọn cho ví dụ:
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
}
