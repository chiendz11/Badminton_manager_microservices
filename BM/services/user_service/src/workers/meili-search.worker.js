import amqp from 'amqplib';
import { MeiliSearch } from 'meilisearch';
import consola from 'consola';
import { UserService } from '../services/user.service.js';
import { EXCHANGE_NAME as EXCHANGES } from '../clients/rabbitmq.client.js';

const client = new MeiliSearch({
    host: process.env.MEILISEARCH_URL || 'http://my_meilisearch:7700',
    apiKey: 'masterKey123'
})

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@my_rabbitmq:5672';
const EXCHANGE_NAME = EXCHANGES.USER_EXTRA_UPDATE_EVENT;
const QUEUE_NAME = 'q_meilisearch_sync';

export const startMeiliSearchWorker = async () => {
    try {
        const connection = await amqp.connect(RABBITMQ_URL);
        const channel = await connection.createChannel();
        
        await channel.assertExchange(EXCHANGE_NAME, 'fanout', { durable: true });
        await channel.assertQueue(QUEUE_NAME, { durable: true });
        await channel.bindQueue(QUEUE_NAME, EXCHANGE_NAME, '');

        consola.info("MeiliSearch Worker is waiting for messages...");

        channel.consume(QUEUE_NAME, async (msg) => {
            if (msg !== null) {
                const messageContent = msg.content.toString();
                const message = JSON.parse(messageContent);
                const user = await UserService.findUserById(message.userId);
                const data = {
                    ...user, 
                    ... message.extraData
                };

                consola.info("Received message for MeiliSearch sync:", data);
                
                try {
                    const index = client.index('users');
                    await index.addDocuments([data]);
                    consola.info(`Successfully indexed user data for userId: ${data.userId}`);
                    channel.ack(msg);
                } catch (error) {
                    consola.error("Failed to index user data in MeiliSearch:", error);
                    // Optionally, we can choose to not ack the message to retry later
                    channel.nack(msg);
                }
            } else {
                consola.warn("Received null message");
                channel.nack(msg);
            }
        });
    } catch (error) {
        consola.error("MeiliSearch Worker failed to start:", error);
    }
};