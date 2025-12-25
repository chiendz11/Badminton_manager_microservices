import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { PassPost } from './pass-booking.schema'; // Import schema bài đăng gốc của bạn

export type InterestedUserDocument = InterestedUser & Document;

@Schema({ timestamps: true }) // Tự động tạo createdAt và updatedAt
export class InterestedUser {
    
    // 1. Người quan tâm (String UserId)
    @Prop({ required: true, type: String })
    userId: string;

    // 2. Bài đăng (ObjectId tham chiếu sang PassPost)
    @Prop({ type: Types.ObjectId, ref: PassPost.name, required: true })
    postId: Types.ObjectId;
}

export const InterestedUserSchema = SchemaFactory.createForClass(InterestedUser);

// 👇 QUAN TRỌNG: Tạo unique index để đảm bảo 1 user chỉ quan tâm 1 post được 1 lần
InterestedUserSchema.index({ userId: 1, postId: 1 }, { unique: true });