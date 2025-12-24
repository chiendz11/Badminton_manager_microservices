    import { RabbitSubscribe } from "@golevelup/nestjs-rabbitmq";
    import { Injectable, Logger } from "@nestjs/common";
    import { InjectModel } from "@nestjs/mongoose";
    import { Model } from "mongoose";
    import { User, UserDocument } from "../Schema/user.schema";

    @Injectable()
    export class UserWorker {
        private readonly logger = new Logger(UserWorker.name);
        
        constructor(
            @InjectModel(User.name)
            private userModel: Model<UserDocument>,
        ) {}

        @RabbitSubscribe({
            exchange: 'user_events_exchange',
            // Lắng nghe cả tạo mới và đổi trạng thái
            routingKey: ['user.create.profile', 'user.update.status'], 
            queue: 'q_booking_user_sync_worker', 
            queueOptions: { durable: true },
        })
        public async handleUserSyncEvents(message: any) {
            try {
                // Validate message
                if (!message || !message.payload) {
                    this.logger.warn('⚠️ Invalid message format received.');
                    return;
                }

                const { type, payload } = message;
                this.logger.log(`📥 Received Event: ${type} | User: ${payload.userId}`);

                switch (type) {
                    // =========================================================
                    // CASE 1: TẠO USER MỚI (Khởi tạo full fields)
                    // =========================================================
                    case 'USER_CREATED':
                        const initUser = {
                            userId: payload.userId,
                            
                            // Đồng bộ điểm (nếu có) hoặc mặc định 0
                            points: payload.points || 0,
                            
                            // Trạng thái hoạt động (Lấy từ payload hoặc mặc định true)
                            isActive: payload.isActive ?? true, 

                            // 👇 KHỞI TẠO CÁC TRƯỜNG CHỐNG SPAM (Reset sạch sẽ)
                            isSpamming: false, 
                            lastSpamTime: null
                        };
                        
                        const newUser = await this.userModel.findOneAndUpdate(
                            { userId: payload.userId },
                            { $set: initUser },
                            { upsert: true, new: true, setDefaultsOnInsert: true }
                        );
                        this.logger.log(`✅ [SYNC] User Created/Synced: ${newUser.userId}`);
                        break;

                    // =========================================================
                    // CASE 2: CẬP NHẬT TRẠNG THÁI (Chỉ update isActive)
                    // =========================================================
                    case 'USER_STATUS_UPDATED':
                        // Chỉ update trường isActive, TUYỆT ĐỐI KHÔNG đụng vào points hay isSpamming
                        const updateResult = await this.userModel.updateOne(
                            { userId: payload.userId },
                            { $set: { isActive: payload.isActive } }
                        );

                        if (updateResult.matchedCount === 0) {
                            this.logger.warn(`⚠️ [SYNC] Update Status Failed: User ${payload.userId} not found.`);
                        } else {
                            this.logger.log(`✅ [SYNC] User Status Updated: ${payload.userId} -> Active: ${payload.isActive}`);
                        }
                        break;

                    default:
                        this.logger.debug(`ℹ️ Ignoring unhandled message type: ${type}`);
                        break;
                }

            } catch (error) {
                this.logger.error('❌ Error processing user sync event:', error);
            }
        }
    } 