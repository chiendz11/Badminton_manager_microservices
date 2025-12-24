import amqp from 'amqplib';
import consola from 'consola';

let channel = null;

// Tên Exchange của User Service (để bắn tin update profile đi nơi khác)
export const EXCHANGE_NAME = 'user_events_exchange';

// Tên Exchange của Booking Service (để lắng nghe tin cộng điểm/spam)
export const BOOKING_EXCHANGE_NAME = 'booking_exchange'; 

export const ROUTING_KEYS = {

    USER_PROFILE_CREATE_EVENT: 'user.create.profile',
    // Các key cũ
    USER_EXTRA_UPDATE_EVENT : 'user.update.extra',
    USER_PROFILE_UPDATE_EVENT : 'user.update.profile',
    USER_STATUS_UPDATE_EVENT : 'user.update.status',
    USER_UPDATE_ANY: 'user.update.*',

    // 👇 CÁC KEY MỚI TỪ BOOKING SERVICE
    USER_POINTS_UPDATED: 'user.points.updated',
    USER_SPAM_DETECTED: 'user.spam.detected',
    
    // 👇👇 KEY MỚI: ÂN XÁ (GỠ SPAM) 👇👇
    USER_SPAM_CLEARED: 'user.spam.cleared'
};

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@my_rabbitmq:5672';

export const initRabbitMQ = async () => {
    try {
        const connection = await amqp.connect(RABBITMQ_URL);
        channel = await connection.createChannel();
        
        await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });
        
        consola.info("✅ RabbitMQ initialized and User exchange asserted.");
        return channel;
    } catch (error) {
        consola.error("❌ Failed to initialize RabbitMQ:", error);
        // Không exit process ở đây để tránh crash app nếu RabbitMQ chưa lên kịp
    }
};

export const  publishToExchange = async (routingKey, message ) => {
    try {
        if (!channel) {
            await initRabbitMQ(); 
            if (!channel) throw new Error("RabbitMQ Channel is not initialized.");
        }

        channel.publish(
            EXCHANGE_NAME, 
            routingKey,
            Buffer.from(JSON.stringify(message)),
            { persistent: true } 
        );
        
        consola.info(`📤 Message published to ${EXCHANGE_NAME} | Key: ${routingKey}`);
    } catch (error) {
        console.error("Failed to publish message:", error);
    }
};