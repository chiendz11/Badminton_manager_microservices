// src/booking/booking.processor.ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Booking } from './Schema/booking.schema'; 
import { BookingStatus } from './Schema/booking.schema';
import { Logger } from '@nestjs/common';

@Processor('booking-expiration')
export class BookingProcessor extends WorkerHost {
    private readonly Logger = new Logger(BookingProcessor.name);
  constructor(
    @InjectModel(Booking.name) 
    private bookingModel: Model<Booking>,
  ) {
    super();
  }

  async process(job: Job<{ bookingId: string }>): Promise<any> {
    const { bookingId } = job.data;
    console.log(`[Queue] Checking expiration for booking ID: ${bookingId}`);

    try {
      const booking = await this.bookingModel.findById(bookingId);

      if (!booking) {
        this.Logger.log(`[Queue] Booking not found: ${bookingId}`);
        return;
      }
      if (booking.bookingStatus === BookingStatus.PENDING) {
        booking.bookingStatus = BookingStatus.CANCELLED;
        await booking.save();
        
        this.Logger.log(`[Queue] Booking ${bookingId} has been CANCELLED due to timeout.`);

      } else {
        this.Logger.log(` [Queue] Booking ${bookingId} is safe. Status: ${booking.bookingStatus}`);
      }
    } catch (error) {
      this.Logger.error(`[Queue] Error processing job ${job.id}:`, error);
      throw error;
      }
  }
}