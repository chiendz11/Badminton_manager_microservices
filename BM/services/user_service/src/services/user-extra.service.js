import { UserExtra } from "../models/user-extra.model.js";
import { consola } from "consola";
import { publishToExchange } from '../clients/rabbitmq.client.js';


export const UserExtraService = {

    async publishUserExtraUpdate(userId, extraData) {
        try {
            const message = {
                userId,
                extraData
            };

            publishToExchange('', message);
            consola.info(`Published user extra update for userId: ${userId}`);
        } catch (error) {
            consola.error("Failed to publish user extra update:", error);
        }
    },
    async findByUserId(userId) {
        return await UserExtra.findOne({ userId });
    },

    async updateUserExtra(userId, extraData) {
        if (UserExtraService.findByUserId(userId) == null) {
            const initData = {
                userId,
                skillLevel: extraData.skillLevel || 'Trung bình',
                playStyle: extraData.playStyle || 'Toàn diện',
                location: extraData.location || '',
                preferredTime: extraData.preferredTime || [],
                bio: extraData.bio || ''
            };
            const userExtra = new UserExtra(initData);
            await userExtra.save();
        }
        return await UserExtra.findOneAndUpdate(
            { userId },
            { $set: extraData },
            { new: true, upsert: true }
        );
    }, 
    async initUserExtra(userId) {
        const initData = {
            userId,
            skillLevel: 'Trung bình',
            playStyle: 'Toàn diện',
            location: '',
            preferredTime: [],
            bio: ''
        };
        const userExtra = new UserExtra(initData);
        return await userExtra.save();
        }

};