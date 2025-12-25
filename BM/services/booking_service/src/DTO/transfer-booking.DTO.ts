// transfer-booking.dto.ts
import { IsNotEmpty, IsString, IsMongoId } from 'class-validator';

export class TransferBookingDto {
  @IsNotEmpty()
  @IsMongoId({ message: 'Booking ID phải là dạng MongoDB ObjectId' })
  bookingId: string; // Cái _id: "6930689d091eff11533d839a"

  @IsNotEmpty()
  @IsString()
  newUserId: string; // Cái userId: "USER-..."
}