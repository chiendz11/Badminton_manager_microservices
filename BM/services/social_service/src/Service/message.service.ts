import { Injectable, NotFoundException } from "@nestjs/common";
import { Model, Types } from "mongoose";
import { FriendshipDocument, FriendshipSchema, Friendship } from "../Schema/friendship.schema";
import { InjectModel } from "@nestjs/mongoose";
import { FriendshipStatus } from "../Schema/friendship.schema";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from 'rxjs';
import { Logger } from "@nestjs/common";
import { Message, MessageDocument } from "../Schema/message.schema";
import { ConversationDocument } from "../Schema/conversation.schema";
import { Conversation } from "../Schema/conversation.schema";

@Injectable()
export class MessageService {
    private readonly logger = new Logger(MessageService.name);
    constructor(
        @InjectModel(Message.name)
        private messageModel: Model<MessageDocument>,
        @InjectModel(Conversation.name)
        private conversationModel: Model<ConversationDocument>
    ){}

    async sendMessage(senderId: string, conversationId: string, content: string) {
        // 1. Create and Save the Message
        const newMessage = new this.messageModel({
            conversationId: new Types.ObjectId(conversationId), // Convert String to ObjectId
            senderId: senderId,
            content: content
        });

        const savedMessage = await newMessage.save();

        // 2. CRITICAL: Update the Conversation's 'updatedAt'
        // This makes the chat jump to the top of the list
        await this.conversationModel.findByIdAndUpdate(
            conversationId,
            { 
                $set: { updatedAt: new Date() } 
            }
        );

        return savedMessage;
    }
}