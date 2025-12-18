// src/graphql/resolvers.js

import CenterService from '../services/center.service.js';
import { getBulkUrls } from '../clients/storage.client.js';
import { Court } from '../models/court.model.js';

const DEFAULT_LOGO_URL = 'https://res.cloudinary.com/default/default-logo.png';
const FALLBACK_LOGO_ID = "https://res.cloudinary.com/dm4uxmmtg/image/upload/v1762859721/badminton_app/avatars/default_user_avatar.png";

export const resolvers = {
    Query: {
        centers: async () => await CenterService.getAllCenters(),
        center: async (_, { centerId }) => await CenterService.getCenterDetails(centerId)
    },

    Mutation: {
        createCenter: async (_, args, context) => {
            const centerData = {
                ...args,
                centerManagerId: args.centerManagerId || context.userId || "USER-ADMIN",
                logo_file_id: args.logoFileId || FALLBACK_LOGO_ID, 
                image_file_ids: args.imageFileIds || []
            };
            
            // Cleanup camelCase keys
            delete centerData.imageFileIds;
            delete centerData.logoFileId;

            return await CenterService.createCenter(centerData.centerManagerId, centerData);
        },

        updateCenter: async (_, { centerId, data }) => {
            // Clone data để tránh mutate object gốc
            const dbUpdateData = { ...data };

            // 💡 MAPPING QUAN TRỌNG: CamelCase -> snake_case
            // Chỉ map nếu client thực sự gửi field này lên
            if (data.imageFileIds !== undefined) {
                dbUpdateData.image_file_ids = data.imageFileIds;
                delete dbUpdateData.imageFileIds; // Xóa key cũ
            }

            if (data.logoFileId !== undefined) {
                dbUpdateData.logo_file_id = data.logoFileId;
                delete dbUpdateData.logoFileId; // Xóa key cũ
            }

            // Gọi service
            return await CenterService.updateCenterInfo(centerId, dbUpdateData);
        },

        deleteCenter: async (_, { centerId }) => {
            return await CenterService.deleteCenter(centerId);
        }
    },

    Center: {
        logoFileId: (parent) => parent.logo_file_id,
        imageFileIds: (parent) => parent.image_file_ids,

        logoUrl: async (parent) => {
            if (!parent.logo_file_id) return DEFAULT_LOGO_URL;
            try {
                const urlMap = await getBulkUrls([parent.logo_file_id]);
                return urlMap[parent.logo_file_id] || DEFAULT_LOGO_URL;
            } catch (e) { return DEFAULT_LOGO_URL; }
        },

        imageUrlList: async (parent) => {
            if (!parent.image_file_ids?.length) return [];
            try {
                const urlMap = await getBulkUrls(parent.image_file_ids);
                return parent.image_file_ids.map(id => urlMap[id]).filter(url => url);
            } catch (e) { return []; }
        },

        courts: async (parent) => {
            try {
                return await Court.find({ centerId: parent.centerId });
            } catch (error) {
                console.error("Error resolving courts:", error);
                return [];
            }
        }
    }
};