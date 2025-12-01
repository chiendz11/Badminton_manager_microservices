import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { CourtBookingDetailSchema, CourtBookingDetail } from './court-booking-detail.schema';

export type BookingDocument = HydratedDocument<Booking>;

export enum BookingStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  FAILED = 'failed',
}

export enum BookingType {
  DAILY = 'daily',
  MONTHLY = 'monthly',
  FLEXIBLE = 'flexible',
}

@Schema({ timestamps: true })
export class Booking {
    @Prop({type: String, required: true})
    userId: string;

    @Prop({type: String, required: true})
    userName: string;

    @Prop({type: String, required: true})
    centerId: string;

    @Prop({type: [CourtBookingDetailSchema], required: true})
    courtBookingDetails: CourtBookingDetail[];

    @Prop({type: Date, required: true})
    bookDate: Date;

    @Prop({type: String, required: true, enum: BookingStatus, default: BookingStatus.PENDING})
    bookingStatus: BookingStatus;
    
    @Prop({type: Number, required: true})
    price: number;

    @Prop({type: Boolean, default: false})
    isDeleted: boolean;

    @Prop({type: String, enum: BookingType, default: BookingType.DAILY})
    bookingType: BookingType;

    @Prop({type: String, default: ''})
    note: string;

    @Prop({type: String, default: ''})
    paymentImageUrl: string;

    @Prop({type: Number, default: 0})
    pointsEarned: number; 
}

export const BookingSchema = SchemaFactory.createForClass(Booking);