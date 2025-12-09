import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
export type FriendshipDocument = HydratedDocument<Friendship>;

export enum FriendshipStatus {
    REQUESTED = 'requested',
    ACCEPTED = 'accepted',
}

@Schema({ timestamps: true })
export class Friendship {
    @Prop({ type: String, required: true})
    requesterId: string;

    @Prop({ type: String, required: true})
    addresseeId: string;

    @Prop({ type: String, required: true, enum: FriendshipStatus, default: FriendshipStatus.REQUESTED })
    status: FriendshipStatus;
}

export const FriendshipSchema = SchemaFactory.createForClass(Friendship);