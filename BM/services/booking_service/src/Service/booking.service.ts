import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { BookingDocument } from '../Schema/booking.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Booking } from '../Schema/booking.schema';
import { CreateBookingDTO } from '../DTO/create-booking.DTO';
import { BookingStatus } from '../Schema/booking.schema';
import { Center } from "../Schema/center.schema";
import { CourtBookingDetail } from 'src/Schema/court-booking-detail.schema';
import { PricingSlot } from 'src/Schema/center-pricing.schema';
import { User } from 'src/Schema/user.schema';
import { startOfDay, endOfDay } from 'date-fns'
import { InjectQueue } from '@nestjs/bullmq';
import { deprecate } from 'util';

const START_HOUR = 5; // e.g., 5 AM
const END_HOUR = 22;  // e.g., 10 PM
const TOTAL_SLOTS = END_HOUR - START_HOUR;
type CreateBookingParams = CreateBookingDTO & {userId: string};

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
  ) {}

  private isWeekend = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDay();
    return day === 0 || day === 6;
  };

  private parseHour = (timeStr: string) => {
    if (!timeStr) return 0;
    return parseInt(timeStr.split(":")[0], 10);
  };

  private calculatePrice = (center : Center, dateStr: string, slotVal: number) => {
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
      centerId : centerId,
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
    const booking = await this.bookingModel.findById(bookingId);

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
}
