import amqp from 'amqplib';
import { UserExtraService } from '../services/user-extra.service.js';
import consola from 'consola';

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@my_rabbitmq:5672';
const EXCHANGE_NAME = 'user_events_exchange';
const QUEUE_NAME = 'q_user_updates';

export const startUserServiceWorker = async () => {
    try {
        const connection = await amqp.connect(RABBITMQ_URL);
        const channel = await connection.createChannel();
        
        await channel.assertExchange(EXCHANGE_NAME, 'fanout', { durable: true });
        await channel.assertQueue(QUEUE_NAME, { durable: true });
        await channel.bindQueue(QUEUE_NAME, EXCHANGE_NAME, '');

        consola.info("User Service Worker is waiting for messages...");

        channel.consume(QUEUE_NAME, async (msg) => {
            if (msg !== null) {
                const messageContent = msg.content.toString();
                const message = JSON.parse(messageContent);

                consola.info("Received message for User Service update:", message);
                
                try {
                    await UserExtraService.updateUserExtra(message.userId, message.extraData);
                    consola.info(`Successfully update user data for userId: ${message.userId}`);
                    channel.ack(msg);
                } catch (error) {
                    consola.error("Failed to index user data in User-Service:", error);
                    channel.nack(msg);
                    // Optionally, we can choose to not ack the message to retry later
                }
            } else {
                consola.warn("Received null message");
                channel.nack(msg);
            }
        });
    } catch (error) {
        consola.error("UserService Worker failed to start:", error);
    }
};