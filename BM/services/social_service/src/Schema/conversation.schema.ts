import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { Message } from './message.schema';
export type ConversationDocument = HydratedDocument<Conversation>;

export enum ConversationType {
    PRIVATE = 'private',
    GROUP = 'group',
}



@Schema({ timestamps: true })
export class Conversation {
    @Prop({type: [String], required: true})
    memberIds: string[];

    @Prop({type: String, enum: ConversationType, required: true, default: ConversationType.PRIVATE})
    type: ConversationType;

    @Prop({type: Message, required: false})
    lastMessage?: Message;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);