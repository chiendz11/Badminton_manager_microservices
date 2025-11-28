import CenterService from '../services/center.service.js';
import { getBulkUrls } from '../clients/storage.client.js';

const DEFAULT_LOGO_URL = 'https://res.cloudinary.com/default/default-logo.png';
// Giả sử bạn có ID mặc định trong env hoặc hardcode một string để bypass validation
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
                
                // --- FIX LỖI Ở ĐÂY ---
                // Nếu FE gửi null, gán ID mặc định để DB không báo lỗi "required"
                logo_file_id: args.logoFileId || FALLBACK_LOGO_ID, 
                // ---------------------

                image_file_ids: args.imageFileIds || []
            };
            
            // Cleanup camelCase keys
            delete centerData.imageFileIds;
            delete centerData.logoFileId;

            return await CenterService.createCenter(centerData.centerManagerId, centerData);
        },

        updateCenter: async (_, { centerId, data }) => {
            // Map data từ input GraphQL sang DB model
            const dbUpdateData = {
                ...data,
                image_file_ids: data.imageFileIds,
                logo_file_id: data.logoFileId
            };
            // Xóa các field camelCase thừa để không ghi rác vào DB
            delete dbUpdateData.imageFileIds;
            delete dbUpdateData.logoFileId;

            // ✅ Lưu ý: centerManagerId đã nằm trong `...data` nên sẽ được update tự động
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
        }
    }
};