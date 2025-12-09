import amqp from 'amqplib';
import { UserExtraService } from '../services/user-extra.service.js';
import { UserService } from '../services/user.service.js';
import consola from 'consola';
import { ROUTING_KEYS, EXCHANGE_NAME } from '../clients/rabbitmq.client.js';

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@my_rabbitmq:5672';
const QUEUE_NAME = 'q_user_updates';

export const startUserServiceWorker = async () => {
    try {
        const connection = await amqp.connect(RABBITMQ_URL);
        const channel = await connection.createChannel();
        
        await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });
        await channel.assertQueue(QUEUE_NAME, { durable: true });

        // 👇 2. Bind Routing Key CŨ (User Extra)
        await channel.bindQueue(QUEUE_NAME, EXCHANGE_NAME, ROUTING_KEYS.USER_EXTRA_UPDATE_EVENT);

        // 👇 3. Bind Routing Key MỚI (User Profile) -> Để Queue nhận được tin nhắn này
        await channel.bindQueue(QUEUE_NAME, EXCHANGE_NAME, ROUTING_KEYS.USER_PROFILE_UPDATE_EVENT);

        await channel.prefetch(1);

        consola.info("🎧 User Service Worker is listening...");

        channel.consume(QUEUE_NAME, async (msg) => {
            if (msg !== null) {
                const messageContent = msg.content.toString();
                const message = JSON.parse(messageContent);
                // 👇 Lấy Routing Key từ metadata của tin nhắn RabbitMQ
                const routingKey = msg.fields.routingKey; 

                consola.info(`Received message [${routingKey}]:`, message);
                
                try {
                    // 👇 4. Dùng Switch-Case check Routing Key để xử lý đúng việc
                    switch (routingKey) {
                        
                        // 👉 CASE A: Update thông tin bổ sung (Logic cũ)
                        case ROUTING_KEYS.USER_EXTRA_UPDATE_EVENT:
                            await UserExtraService.updateUserExtra(message.userId, message.extraData);
                            consola.success(`✅ Updated UserExtra for userId: ${message.userId}`);
                            break;

                        // 👉 CASE B: Update trạng thái (Logic MỚI)
                        case ROUTING_KEYS.USER_PROFILE_UPDATE_EVENT:
                            // Giả sử payload gửi sang là { userId: '...', isActive: true/false }
                            if (message.payload.userId && message.payload.isActive !== undefined) {
                                await UserService.updateUserStatus(message.payload.userId, message.payload.isActive);
                                consola.success(`✅ Updated Status for userId: ${message.payload.userId} -> ${message.payload.isActive}`);
                            } else {
                                consola.warn("⚠️ Invalid payload for status update");
                            }
                            break;

                        default:
                            consola.warn(`⚠️ Unhandled routing key: ${routingKey}`);
                    }

                    channel.ack(msg);
                } catch (error) {
                    consola.error(`❌ Error processing ${routingKey}:`, error);
                    // Nếu lỗi nghiêm trọng thì nack, còn lỗi logic data thì ack để bỏ qua
                    channel.nack(msg, false, false); 
                }
            } else {
                consola.warn("Received null message");
            }
        });
    } catch (error) {
        consola.error("UserService Worker failed to start:", error);
    }
};