import { RabbitSubscribe } from "@golevelup/nestjs-rabbitmq";
import { Injectable } from "@nestjs/common";
import { Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { User, UserDocument } from "../Schema/user.schema";

@Injectable()
export class UserWorker {
    private readonly Logger = new Logger(UserWorker.name);
    constructor(
        @InjectModel(User.name)
        private userModel: Model<UserDocument>,
    ) {}

    @RabbitSubscribe({
        exchange: 'user_events_exchange',
        routingKey: 'user.update.profile',
        queue: 'q_user_social_updates',
        queueOptions: { durable: true },
    })
    public async handleUserProfileUpdate(message: any) {
        try {
            this.Logger.log(`Received user profile update message: ${JSON.stringify(message)}`);
            if (!message || !message.payload) {
                this.Logger.warn('Invalid message format received in user profile update worker.');
                return;
            }
            
            const userProfile = message.payload.savedProfile||message.payload;
            const createUser = {
                    userId: userProfile.userId,
                    name: userProfile.name,
                    username: userProfile.username,
                    avatar_url: userProfile.avatar_url,
                    role: userProfile.role,
            }
            this.Logger.log(`Processing user profile for userId: ${userProfile.userId}`);
            // should resesign to leave this to a service
            const newUser = await this.userModel.findOneAndUpdate(
                { userId: userProfile.userId },
                {$set: createUser},
                { upsert: true, new: true, setDefaultsOnInsert: true }
            )
            this.Logger.log(`User profile created/updated for userId: ${newUser}`);
        } catch (error) {
            this.Logger.error('Error processing user profile update message:', error);
        }
    }
}