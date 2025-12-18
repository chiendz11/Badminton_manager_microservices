import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({ type: String, required: true, unique: true })
  userId: string; 

  @Prop({ type: Number, required: true, default: 0 })
  points: number;

  // 👇 BẮT BUỘC PHẢI CÓ: Để đồng bộ trạng thái Khóa cứng từ User Service sang
  @Prop({ type: Boolean, default: true }) 
  isActive: boolean; 

  // --- LOGIC CHẶN SPAM (Soft Ban) ---
  @Prop({ type: Boolean, default: false })
  isSpamming: boolean; 

  @Prop({ type: Date, default: null })
  lastSpamTime: Date; 
}

export const UserSchema = SchemaFactory.createForClass(User);