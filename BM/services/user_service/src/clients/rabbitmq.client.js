import amqp from 'amqplib';
import consola from 'consola';

let channel = null;
export const EXCHANGE_NAME = 'user_events_exchange';

export const ROUTING_KEYS = {
    USER_EXTRA_UPDATE_EVENT : 'user.update.extra',
    USER_PROFILE_UPDATE_EVENT : 'user.update.profile',
    USER_STATUS_UPDATE_EVENT : 'user.update.status',
    USER_UPDATE_ANY: 'user.update.*'
};

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@my_rabbitmq:5672';

export const initRabbitMQ = async () => {
    try {
        const connection = await amqp.connect(RABBITMQ_URL);
        channel = await connection.createChannel();
        
        await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });
        
        consola.info("RabbitMQ initialized and exchange asserted.");
        return channel;
    } catch (error) {
        consola.error("Failed to initialize RabbitMQ:", error);
        process.exit(1); 
    }
};

export const publishToExchange = async (routingKey, message ) => {
    try {
        if (!channel) {
            throw new Error("RabbitMQ Channel is not initialized. Call initRabbitMQ first.");
        }

        channel.publish(
            EXCHANGE_NAME, 
            routingKey,
            Buffer.from(JSON.stringify(message)),
            { persistent: true } 
        );
        
        consola.info(`Message published to exchange ${EXCHANGE_NAME} with routing key ${routingKey}`);
    } catch (error) {
        console.error("Failed to publish message:", error);
    }
};