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
import { Court, CourtSchema } from './Schema/court.schema';
import { BullModule } from '@nestjs/bullmq';
import { BookingProcessor } from './booking-expiration.processor';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { UserWorker } from './Worker/user-profile.worker';
import { PassPost, PassPostSchema} from './Schema/pass-booking.schema'
import { PassPostService } from './Service/pass-booking.service'
import { PassPostController } from './Controller/passbooking.controller'
import { InterestedUser, InterestedUserSchema} from './Schema/interested_user.schema'
import Redis from 'ioredis';
import { HttpModule } from '@nestjs/axios'

@Module({
  imports: [
    HttpModule,
    RabbitMQModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get("RABBITMQ_URI") || 'amqp://guest:guest@my_rabbitmq:5672',
        exchanges: [
          // 1. SỬA TÊN EXCHANGE CHO KHỚP VỚI CODE SERVICE
          {
            name: 'booking_exchange', // Phải trùng với tên trong amqpConnection.publish()
            type: 'topic',
          },
          // Nếu bạn vẫn cần exchange cũ cho tính năng khác thì giữ lại, không thì xóa
          {
             name: 'user_events_exchange',
             type: 'topic',
          }
        ],
        connectionInitOptions: {
          wait: true,
          retries: 5,
          delay: 3000,
        },
      }),
      inject: [ConfigService],
    }),

    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        connection: {
          host: configService.get('REDIS_HOST') || 'redis',
          port: configService.get('REDIS_PORT') || 6379,
        },
      }),
      inject: [ConfigService],
    }),

    BullModule.registerQueue({
      name: 'booking-expiration',
    }),

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
    MongooseModule.forFeature([{ name: Court.name, schema: CourtSchema }]),
    MongooseModule.forFeature([{ name: PassPost.name, schema: PassPostSchema}]),
    MongooseModule.forFeature([{ name: InterestedUser.name, schema: InterestedUserSchema }]),
  ],
  controllers: [
    BookingController,
    CenterController,
    PaymentController,
    PassPostController,
  ],
  providers: [
    BookingService,
    CenterService,
    PaymentService,
    BookingProcessor,
    UserWorker,
    PassPostService, 
    
    // 3. PROVIDER CHO REDIS CLIENT
    {
      provide: 'REDIS_CLIENT',
      useFactory: (configService: ConfigService) => {
        return new Redis({
          host: configService.get('REDIS_HOST') || 'redis',
          port: configService.get('REDIS_PORT') || 6379,
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: ['REDIS_CLIENT'],
})
export class BookingModule {}