
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type NotificationDocument = HydratedDocument<Notification>;

@Schema({ timestamps: true })
export class Notification {
  @Prop({ required: true })
  userId: string;

  // 👇 Sửa 'message' thành 'notiMessage'
  @Prop({ required: true })
  notiMessage: string; 

  // 👇 Sửa 'type' thành 'notiType'
  @Prop({ required: true })
  notiType: string; 

  @Prop({ default: false })
  isRead: boolean;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);