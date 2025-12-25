import { Injectable, NotFoundException } from "@nestjs/common";
import { Model } from "mongoose";
import { FriendshipDocument, FriendshipSchema, Friendship } from "../Schema/friendship.schema";
import { InjectModel } from "@nestjs/mongoose";
import { FriendshipStatus } from "../Schema/friendship.schema";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from 'rxjs';
import { Logger } from "@nestjs/common";
import { ConversationService } from "./conversation.service";
import { UserDocument, User } from "../Schema/user.schema";
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';

export const enum FriendshipFilterType {
    NOT_FRIEND = 'not_friend',
    FRIENDS = 'friends',
    REQUESTED = 'requested',
    BEING_REQUESTED = 'being_requested',
}
@Injectable()
export class FriendshipService {
    private readonly logger = new Logger(FriendshipService.name);
    constructor(
        @InjectModel(User.name)
        private userModel: Model<UserDocument>,
        @InjectModel(Friendship.name)
        private friendshipModel: Model<FriendshipDocument>,
        private readonly httpService: HttpService,
        private readonly conversationService: ConversationService,
        private readonly amqpConnection: AmqpConnection,
    ){}

    async createFriendship(requesterId: string, addresseeId: string): Promise<Friendship> {
        const newFriendship = new this.friendshipModel({ requesterId, addresseeId });
        const sender = await this.userModel.findOne({ userId: requesterId }).lean();
        const senderName = sender ? sender.name : 'Ai đó';

        // B. Bắn tin sang RabbitMQ
        this.amqpConnection.publish(
            'notification_exchange', // Exchange
            'create_notification',   // Routing Key
            {
                // QUAN TRỌNG: Gửi cho người được mời (Addressee)
                userId: addresseeId, 
                
                // Nội dung: "Huy đã gửi lời mời kết bạn cho bạn"
                notiMessage: `${senderName} đã gửi lời mời kết bạn cho bạn.`,
                
                // Loại noti (Để frontend hiện icon dấu cộng hoặc avatar người gửi)
                notiType: 'FRIEND_REQUEST',
                
                isRead: false
            }
        );
        return newFriendship.save();
    }

    async acceptFriendRequest(userId: string, friendId: string): Promise<Friendship> {
        const acceptedFriendship = await this.friendshipModel.findOneAndUpdate(
            { $and: [
                { requesterId: friendId},
                { addresseeId: userId}
            ]},
            {$set: { status: FriendshipStatus.ACCEPTED }},
            { new: true, upsert: false, lean: true }

        );
        if (!acceptedFriendship) {
            throw new NotFoundException("Friend request unsuccessful");
        }
        const accepter = await this.userModel.findOne({ userId: userId }).lean();
        const accepterName = accepter ? accepter.name : 'Một người bạn';
        this.amqpConnection.publish(
            'notification_exchange', // Exchange
            'create_notification',   // Routing Key
            {
                // Gửi cho người đã gửi lời mời ban đầu (friendId)
                userId: friendId, 
                
                // Nội dung: "Nguyễn Văn A đã chấp nhận..."
                notiMessage: `${accepterName} đã chấp nhận lời mời kết bạn!`,
                
                notiType: 'FRIEND_ACCEPT',
                isRead: false
            }
        );
        return acceptedFriendship;
    }

    async deleteFriend(userId: string, friendId: string) {
        await this.friendshipModel.findOneAndDelete({
            $or: [
                { requesterId: userId, addresseeId: friendId },
                { requesterId: friendId, addresseeId: userId } 
            ]
        });
    }

    private async getUserFriendsRequestRequested(userId: string): Promise<Map<string, any>> {
        const friendships = await this.friendshipModel.find({
            $or: [
                { requesterId: userId },
                { addresseeId: userId }
            ],
            status: { $in: [FriendshipStatus.REQUESTED, FriendshipStatus.ACCEPTED] } 
            }).lean();

        const friendMap = new Map<string, any>();

            for (const friendship of friendships) {
                let friendStatus: string = '';
                const friendKey = (friendship.requesterId === userId) 
                    ? friendship.addresseeId 
                    : friendship.requesterId;

                if (friendship.status === FriendshipStatus.ACCEPTED) {
                    friendStatus = FriendshipFilterType.FRIENDS;

                } else if (friendship.status === FriendshipStatus.REQUESTED) {
                    if (friendship.requesterId === userId) {
                        friendStatus = FriendshipFilterType.REQUESTED;

                    } else {
                        friendStatus = FriendshipFilterType.BEING_REQUESTED;
                    }
                }

                friendMap.set(friendKey,{
                        friendStatus
                });
            }
        return friendMap;
    }

    async getPendingRequests(userId: string) {
        const requests = await this.friendshipModel.find({
            addresseeId: userId,
            status: FriendshipStatus.REQUESTED
        }).lean();

        const requesterIds = requests.map(req => req.requesterId);

        const pendingUsersDetails = await this.userModel.find({
            userId: { $in: requesterIds }
        })
        .select('name avatar_url userId username') 
        .lean();

        return pendingUsersDetails;
    }

    async getUserFriends(userId: string) {
        const friendships = await this.friendshipModel.find({
            $or: [{ requesterId: userId }, { addresseeId: userId }],
            status: FriendshipStatus.ACCEPTED
        }).lean();

        const friendIds = friendships.map(f => 
            f.requesterId === userId ? f.addresseeId : f.requesterId
        );

        const friendsDetails = await this.userModel.find({
            userId: { $in: friendIds }
        })
        .select('username avatar_url userId name') 
        .lean();

        return friendsDetails;
    }

    async getMeiliSearchResultFilteredByFriendshipStatus(userId: string, keyword: string): Promise<any[]> {
        const meiliSearchResults = await firstValueFrom(this.httpService.get('http://user_service:8085/api/?keyword=' + keyword));
        const friendshipMap = await this.getUserFriendsRequestRequested(userId);
        const meiliSearchResultsFiltered: any[] = [];
        
        this.logger.log(meiliSearchResults.data.data);
        this.logger.log(friendshipMap);
        for (const user of meiliSearchResults.data.data) {
            if (user.userId === userId) {
                continue;
            }
            if (friendshipMap.has(user.userId)) {
                meiliSearchResultsFiltered.push({
                    ...user,
                    friendStatus: friendshipMap.get(user.userId).friendStatus
                });
            } else {
                meiliSearchResultsFiltered.push({
                    ...user,
                    friendStatus: FriendshipFilterType.NOT_FRIEND
                });
            }
        }
        return meiliSearchResultsFiltered;
    }
}