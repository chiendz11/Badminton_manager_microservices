// auth_service/src/clients/rabbitmq.client.js
import amqp from 'amqplib';

let channel = null;
// Sử dụng cùng Exchange Name với User Service để đồng bộ
const EXCHANGE_NAME = 'user_profile_events_exchange'
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';

export const initRabbitMQ = async () => {
    try {
        const connection = await amqp.connect(RABBITMQ_URL);
        channel = await connection.createChannel();
        
        // Tạo Exchange loại 'fanout' để bắn tin cho tất cả các service (User, Booking...)
        await channel.assertExchange(EXCHANGE_NAME, 'fanout', { durable: true });
        
        console.log("[RabbitMQ] Connected and Exchange asserted.");
        return channel;
    } catch (error) {
        console.error("[RabbitMQ] Failed to connect:", error);
        // Không exit process ở đây để tránh crash app nếu RabbitMQ chưa sẵn sàng ngay lập tức
    }
};

export const publishToExchange = async (eventKey, message) => {
    try {
        if (!channel) {
            await initRabbitMQ();
        }
        if (channel) {
            channel.publish(
                EXCHANGE_NAME,
                '', // Fanout không cần routing key
                Buffer.from(JSON.stringify({ type: eventKey, ...message })),
                { persistent: true }
            );
            console.log(`[RabbitMQ] Published event: ${eventKey}`);
        }
    } catch (error) {
        console.error("[RabbitMQ] Publish error:", error);
    }
};