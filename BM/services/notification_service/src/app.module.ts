import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { NotificationService } from './Service/notification.service';
import { Notification, NotificationSchema } from './Schema/notification.schema';
import { NotificationController} from './Controller/notification.controller'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // 1. Kết nối MongoDB
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGO_URI'),
      }),
      inject: [ConfigService],
    }),

    // 2. Đăng ký Schema
    MongooseModule.forFeature([{ name: Notification.name, schema: NotificationSchema }]),

    // 3. Kết nối RabbitMQ (Consumer)
    // 👇 ĐÃ SỬA: Xóa tham số RabbitMQModule ở đầu, chỉ để lại object config
    RabbitMQModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        // Đảm bảo URI trỏ đúng container rabbitmq
        uri: configService.get('RABBITMQ_URI') || 'amqp://guest:guest@rabbitmq:5672',
        exchanges: [
          {
            name: 'notification_exchange',
            type: 'topic',
          },
        ],
        connectionInitOptions: { wait: true },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [
    NotificationController,
  ],
  providers: [NotificationService],
})
export class AppModule {}