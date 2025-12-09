import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema()
export class User {
    @Prop({ required: true, unique: true, index : true })
    userId: string;

    @Prop({ required: true })
    name: string;

    @Prop({ required: true })
    username: string;

    @Prop({ default: null })
    avatar_url: string;

    @Prop({ required: true, enum: ['USER', 'CENTER_MANAGER', 'SUPER_ADMIN'] })
    role: string;

    @Prop({ enum: ['đồng', 'bạc', 'vàng', 'bạch kim', 'kim cương'] })
    level?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);