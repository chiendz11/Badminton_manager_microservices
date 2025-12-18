import { RabbitSubscribe } from "@golevelup/nestjs-rabbitmq";
import { Injectable, Logger } from "@nestjs/common";
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

    // ==================================================================
    // 1. HANDLER: TẠO USER MỚI (User Created)
    // Routing Key: 'user.create.profile'
    // ==================================================================
    @RabbitSubscribe({
        exchange: 'user_events_exchange',
        routingKey: 'user.create.profile',
        queue: 'q_social_user_created',
        queueOptions: { durable: true },
    })
    public async handleUserCreated(message: any) {
        try {
            if (!message || !message.payload) return;

            const profile = message.payload;
            this.Logger.log(`🆕 [Social] Syncing NEW User: ${profile.username}`);

            // 🟢 CHỈ MAP NHỮNG TRƯỜNG CÓ TRONG SCHEMA SOCIAL
            const newUserPayload = {
                userId: profile.userId,
                name: profile.name,
                username: profile.username,
                avatar_url: profile.avatar_url || null, // Default null theo schema
                role: profile.role || 'USER'
                // ❌ Bỏ qua: email, phone, points, isActive...
            };

            // Upsert: Nếu có rồi thì update, chưa có thì insert
            await this.userModel.findOneAndUpdate(
                { userId: profile.userId },
                { $set: newUserPayload },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );

            this.Logger.log(`✅ [Social] User ${profile.userId} created/synced.`);
        } catch (error) {
            this.Logger.error(`❌ [Social] Create Sync Error:`, error);
        }
    }

    // ==================================================================
    // 2. HANDLER: CẬP NHẬT USER (User Updated)
    // Routing Key: 'user.update.profile'
    // ==================================================================
    @RabbitSubscribe({
        exchange: 'user_events_exchange',
        routingKey: 'user.update.profile',
        queue: 'q_social_user_updates',
        queueOptions: { durable: true },
    })
    public async handleUserUpdated(message: any) {
        try {
            if (!message || !message.payload) return;

            const profile = message.payload;
            this.Logger.log(`🔄 [Social] Syncing UPDATE User: ${profile.userId}`);

            // 🟢 CHỈ CẬP NHẬT NHỮNG TRƯỜNG CÓ TRONG SCHEMA
            const updatePayload: any = {};

            if (profile.name) updatePayload.name = profile.name;
            if (profile.username) updatePayload.username = profile.username;
            if (profile.avatar_url) updatePayload.avatar_url = profile.avatar_url;
            if (profile.role) updatePayload.role = profile.role;
            
            // ❌ Không map email, phone... vì Schema không có chỗ chứa

            const result = await this.userModel.updateOne(
                { userId: profile.userId },
                { $set: updatePayload }
            );

            if (result.matchedCount > 0) {
                this.Logger.log(`✅ [Social] User ${profile.userId} updated.`);
            } else {
                this.Logger.warn(`⚠️ [Social] Update skipped: User ${profile.userId} not found locally.`);
            }

        } catch (error) {
            this.Logger.error(`❌ [Social] Update Sync Error:`, error);
        }
    }
}