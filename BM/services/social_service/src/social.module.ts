import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './Schema/user.schema'
import { UserWorker } from './Worker/user.worker';
import { HttpModule } from '@nestjs/axios';
import { FriendshipService } from './Service/friendship.service';
import { FriendshipController } from './Controller/friendship.controller';
import { Friendship } from './Schema/friendship.schema';
import { FriendshipSchema } from './Schema/friendship.schema';
import { ConversationService } from './Service/conversation.service';
import { Conversation, ConversationSchema } from './Schema/conversation.schema';
import { ConversationController } from './Controller/conversation.controller';
import { MessageController } from './Controller/message.controller';
import { MessageService } from './Service/message.service';
import { Message, MessageSchema } from './Schema/message.schema';
import { ChatGateway } from './Gateway/chat.gateway';


@Module({
  imports: [
    HttpModule,
    RabbitMQModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
      uri: configService.get("RABBITMQ_URI") || 'amqp://guest:guest@my_rabbitmq:5672', //not process.env.RABBITMQ_URI
      exchanges: [
        {
          name: 'user_events_exchange',
          type: 'topic',
          options: {
            durable: true,
          },
        },
      ],
      connectionInitOptions: {
        wait: true,
        retries: 5,
        delay: 3000,
      },
    }),
      inject: [ConfigService],
  }),
  MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGO_URI'),
      }),
    }),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Friendship.name, schema: FriendshipSchema },
      { name: Conversation.name, schema: ConversationSchema},
      { name: Message.name, schema: MessageSchema}
    ]),
  ],
  controllers: [
    FriendshipController,
    ConversationController,
    MessageController,

  ],
  providers: [
    UserWorker,
    FriendshipService,
    ConversationService,
    MessageService,
    ChatGateway
  ],
})
export class AppModule {}
