import amqp from 'amqplib';
import { MeiliSearch } from 'meilisearch';
import consola from 'consola';
import { UserService } from '../services/user.service.js';
import { ROUTING_KEYS, EXCHANGE_NAME} from '../clients/rabbitmq.client.js';

const client = new MeiliSearch({
    host: process.env.MEILISEARCH_URL || 'http://my_meilisearch:7700',
    apiKey: 'masterKey123'
})

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@my_rabbitmq:5672';
const QUEUE_NAME = 'q_meilisearch_sync';

export const startMeiliSearchWorker = async () => {
    try {
        const connection = await amqp.connect(RABBITMQ_URL);
        const channel = await connection.createChannel();
        
        await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });
        await channel.assertQueue(QUEUE_NAME, { durable: true });
        await channel.bindQueue(QUEUE_NAME, EXCHANGE_NAME, ROUTING_KEYS.USER_UPDATE_ANY);
        await channel.prefetch(1);

        consola.info("MeiliSearch Worker is waiting for messages...");

        channel.consume(QUEUE_NAME, async (msg) => {
            if (msg !== null) {
                const routingKey = msg.fields.routingKey; 
                consola.info(`Received message from key: [${routingKey}]`);
                const messageContent = msg.content.toString();
                const message = JSON.parse(messageContent);
                let update = {};

                consola.info("Received message for MeiliSearch sync:", message);
                const index = client.index('users');
                const data = message.payload || message;

                
                switch (routingKey) {
                    case ROUTING_KEYS.USER_PROFILE_UPDATE_EVENT:
                        if (data) {
                            update = {
                                userId: data.userId,
                                ... data
                            }
                        } else {
                            consola.warn("⚠️ Invalid payload for status update");
                        }
                        break;
                    case ROUTING_KEYS.USER_EXTRA_UPDATE_EVENT:
                        update = {
                            userId: message.userId,
                            ...message.extraData
                        }
                        break;
                    default:
                        consola.warn(`Unhandled routing key: ${routingKey}`);
                        channel.ack(msg);
                        return;
                }
                try {
                    await index.updateDocuments([update]);
                    consola.info(`Successfully indexed user data for userId: ${update.userId}`);
                    channel.ack(msg);
                } catch (error) {
                    consola.error("Failed to index user data in MeiliSearch:", error);
                    channel.nack(msg, false, false);
                }
            } else {
                consola.warn("Received null message");
                return;
            }
        });
    } catch (error) {
        consola.error("MeiliSearch Worker failed to start:", error);
    }
};