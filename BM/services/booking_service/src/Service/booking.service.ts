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

type CreateBookingParams = CreateBookingDTO & {userId: string};

@Injectable()
export class BookingService {
  constructor(
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

  async updateBookingStatusToProcessing(bookingId: string): Promise<Booking | null> {
    const booking = await this.bookingModel.findById(bookingId);

    if (!booking) {
      throw new Error('Booking not found');
    }
    
    booking.bookingStatus = BookingStatus.PROCESSING;
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
