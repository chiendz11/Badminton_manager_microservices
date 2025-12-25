import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type PassPostDocument = HydratedDocument<PassPost>;

export enum PassPostStatus {
    ACTIVE = 'ACTIVE',
    SOLD = 'SOLD',
    EXPIRED = 'EXPIRED',
    CANCELLED = 'CANCELLED'  
}

@Schema({ timestamps: true })
export class PassPost {
    @Prop({ type: Types.ObjectId, ref: 'Booking', required: true, unique: true })
    bookingId: Types.ObjectId;

    @Prop({ type: String, ref: 'User', required: true })
    sellerId: string;

    @Prop({ required: true })
    originalPrice: number;

    @Prop({ required: true })
    resalePrice: number;

    @Prop({ type: String })
    description: string;

    @Prop({ type: String, enum: PassPostStatus, default: PassPostStatus.ACTIVE })
    status: PassPostStatus;
    
    @Prop({ type: Date, required: true })
    expiresAt: Date;
}

export const PassPostSchema = SchemaFactory.createForClass(PassPost);

PassPostSchema.index({ status: 1, expiresAt: 1 });