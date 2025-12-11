import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Friendship } from "src/Schema/friendship.schema";
import { Logger } from "@nestjs/common";
import { Model, Mongoose } from "mongoose";
import { Conversation, ConversationDocument, ConversationType } from "src/Schema/conversation.schema";

@Injectable()
export class ConversationService {
    private readonly logger = new Logger(ConversationService.name);
    constructor(
        @InjectModel(Conversation.name)
        private conversationModel: Model<ConversationDocument>,
    ){}

    async initConversation(friendship: Friendship): Promise<Conversation>{
        Logger.log("Conversation init started");
        const members = [
            friendship.requesterId.toString(), 
            friendship.addresseeId.toString()
        ];
        const existingConversation = await this.conversationModel.findOne({
            memberIds: { 
                $all: members, 
                $size: 2
            }
        }).exec();
        if (existingConversation) {
            return existingConversation;
        }
        const newConversation = new this.conversationModel({
            memberIds: members
        }).save();
        if (!newConversation) {
            throw new InternalServerErrorException("Conversation Init fail");
        }
        return newConversation;
    }

    async getConversation(userId: string, friendId: string) {
        const members = [userId, friendId];

        const result = await this.conversationModel.aggregate([
            // 1. MATCH: Find the specific private conversation
            {
                $match: {
                    memberIds: { $all: members, $size: 2 },
                    type: ConversationType.PRIVATE
                }
            },

            // 2. LOOKUP USERS: Join with User collection to get names/avatars
            {
                $lookup: {
                    from: 'users',            // Collection name
                    localField: 'memberIds',  // Matches ['USER-1', 'USER-2']
                    foreignField: 'userId',   // Matches userId in User collection
                    as: 'memberDetails'
                }
            },

            // 3. LOOKUP MESSAGES: Join with Messages collection
            {
                $lookup: {
                    from: 'messages',          // ⚠️ Default collection name for 'Message' class
                    let: { convId: '$_id' },   // Pass the Conversation ID variable
                    pipeline: [
                        { 
                            $match: { 
                                $expr: { $eq: ['$conversationId', '$$convId'] } 
                            } 
                        },
                        { $sort: { createdAt: 1 } } // 1 = Oldest to Newest (Standard for chat)
                    ],
                    as: 'messages'
                }
            },

            // 4. PROJECT: Select the fields to return
            {
                $project: {
                    _id: 1,
                    type: 1,
                    memberDetails: {
                        userId: 1,
                        name: 1,
                        avatar_url: 1,
                        username: 1
                    },
                    messages: {
                        _id: 1,
                        senderId: 1,
                        content: 1,
                        createdAt: 1
                    }
                }
            }
        ]).exec();

        return result[0] || null;
    }

    async getAllConversations(userId: string) {
        return await this.conversationModel.aggregate([
            {
                $match: {
                    memberIds: userId 
                }
            },

            {
                $sort: { updatedAt: -1 }
            },

            {
                $lookup: {
                    from: 'users',
                    localField: 'memberIds',
                    foreignField: 'userId',
                    as: 'memberDetails'
                }
            },

            {
                $project: {
                    _id: 1,
                    type: 1,
                    memberDetails: {
                        userId: 1,
                        name: 1,
                        username: 1,
                        avatar_url: 1
                    }
                }
            }
        ]).exec();
    }
}