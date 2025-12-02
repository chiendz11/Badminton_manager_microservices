import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BookingController } from './Controller/booking.controller';
import { BookingService } from './Service/booking.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Booking, BookingSchema } from './Schema/booking.schema';
import { Center, CenterSchema } from './Schema/center.schema';
import { User, UserSchema } from './Schema/user.schema';
import { CenterController } from './Controller/center.controller';
import { PaymentController } from './Controller/payment.controller';
import { CenterService } from './Service/center.service';
import { PaymentService } from './Service/payment.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGO_URI'),
      }),
    }),
    MongooseModule.forFeature([{ name: Booking.name, schema: BookingSchema }]),
    MongooseModule.forFeature([{ name: Center.name, schema: CenterSchema }]),
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),

  ],
  controllers: [
    BookingController, 
    CenterController,
    PaymentController,

  ],
  providers: [
    BookingService,
    CenterService,
    PaymentService,
  ],
})
export class BookingModule {}
