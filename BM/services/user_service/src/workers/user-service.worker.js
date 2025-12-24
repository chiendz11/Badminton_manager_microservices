import amqp from 'amqplib';
import { UserExtraService } from '../services/user-extra.service.js';
import { UserService } from '../services/user.service.js';
import consola from 'consola';
import { 
    ROUTING_KEYS, 
    EXCHANGE_NAME, 
    BOOKING_EXCHANGE_NAME 
} from '../clients/rabbitmq.client.js';

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@my_rabbitmq:5672';
const QUEUE_NAME = 'q_user_updates';

export const startUserServiceWorker = async () => {
    try {
        const connection = await amqp.connect(RABBITMQ_URL);
        const channel = await connection.createChannel();
        
        // 1. Setup Exchange USER
        await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });
        await channel.assertQueue(QUEUE_NAME, { durable: true });
        await channel.bindQueue(QUEUE_NAME, EXCHANGE_NAME, 'user.#'); 

        // 2. Setup Exchange BOOKING
        await channel.assertExchange(BOOKING_EXCHANGE_NAME, 'topic', { durable: true });
        await channel.bindQueue(QUEUE_NAME, BOOKING_EXCHANGE_NAME, 'user.#');

        await channel.prefetch(1);
        consola.info(`🎧 User Worker listening on [${EXCHANGE_NAME}] & [${BOOKING_EXCHANGE_NAME}]`);

        channel.consume(QUEUE_NAME, async (msg) => {
            if (msg !== null) {
                const messageContent = msg.content.toString();
                let message;
                try {
                    const parsed = JSON.parse(messageContent);
                    message = parsed.payload || parsed; 
                } catch (e) {
                    consola.error("❌ JSON Parse error", e);
                    channel.nack(msg, false, false);
                    return;
                }
                    
                const routingKey = msg.fields.routingKey; 
                consola.info(`📨 Received [${routingKey}]`);
                
                try {
                    switch (routingKey) {
                        case ROUTING_KEYS.USER_EXTRA_UPDATE_EVENT:
                            await UserExtraService.updateUserExtra(message.userId, message.extraData);
                            break;

                        case ROUTING_KEYS.USER_STATUS_UPDATE_EVENT:
                            if (message.userId && message.isActive !== undefined) {
                                await UserService.updateUserStatus(message.userId, message.isActive);
                                consola.success(`✅ Status updated: ${message.userId} -> ${message.isActive}`);
                            }
                            break;

                        case ROUTING_KEYS.USER_POINTS_UPDATED:
                            if (message.userId && message.pointsToAdd) {
                                await UserService.updateUserPoints(message.userId, message.pointsToAdd);
                                consola.success(`💰 Points updated: ${message.userId} (+${message.pointsToAdd})`);
                            }
                            break;

                        // 👇 CASE: Xử lý Spam (Soft/Hard Ban)
                        case ROUTING_KEYS.USER_SPAM_DETECTED:
                            if (message.userId) {
                                // Logic đếm số lần và ban nằm trong Service
                                await UserService.handleSpamDetection(message.userId);
                            }
                            break;

                        // 👇 CASE: Ân xá (Gỡ Spam)
                        case ROUTING_KEYS.USER_SPAM_CLEARED:
                            if (message.userId) {
                                await UserService.unmarkUserSpam(message.userId);
                            }
                            break;

                        case ROUTING_KEYS.USER_PROFILE_UPDATE_EVENT:
                            break; // Ack only

                        default:
                            consola.debug(`⚠️ Unhandled routing key: ${routingKey}`);
                    }

                    channel.ack(msg);
                } catch (error) {
                    consola.error(`❌ Error processing ${routingKey}:`, error);
                    channel.nack(msg, false, false); 
                }
            }
        });
    } catch (error) {
        consola.error("❌ Worker failed to start:", error);
        setTimeout(startUserServiceWorker, 5000);
    }
};