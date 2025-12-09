import amqp from 'amqplib';
import consola from 'consola';

let channel = null;
export const EXCHANGE_NAME = {
    USER_EXTRA_UPDATE_EVENT : 'user_extra_events_exchange',
    USER_PROFILE_UPDATE_EVENT : 'user_profile_events_exchange'

};
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@my_rabbitmq:5672';

export const initRabbitMQ = async () => {
    try {
        const connection = await amqp.connect(RABBITMQ_URL);
        channel = await connection.createChannel();
        
        await channel.assertExchange(EXCHANGE_NAME.USER_EXTRA_UPDATE_EVENT, 'fanout', { durable: true });
        await channel.assertExchange(EXCHANGE_NAME.USER_PROFILE_UPDATE_EVENT, 'fanout', { durable: true });
        
        consola.info("RabbitMQ initialized and exchange asserted.");
        return channel;
    } catch (error) {
        consola.error("Failed to initialize RabbitMQ:", error);
        process.exit(1); 
    }
};

export const publishToExchange = async (routingKey, message, exchange ) => {
    try {
        if (!channel) {
            throw new Error("RabbitMQ Channel is not initialized. Call initRabbitMQ first.");
        }

        channel.publish(
            exchange, 
            routingKey, // Fanout không cần routing key, để rỗng
            Buffer.from(JSON.stringify(message)),
            { persistent: true } 
        );
        
        consola.info(`Message published to exchange ${exchange}`);
    } catch (error) {
        console.error("Failed to publish message:", error);
    }
};