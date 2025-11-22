import CenterService from '../services/center.service.js';
import { getBulkUrls } from '../clients/storage.client.js';

const DEFAULT_LOGO_URL = 'https://res.cloudinary.com/default/default-logo.png';

export const resolvers = {
    Query: {
        centers: async () => await CenterService.getAllCenters(),
        center: async (_, { centerId }) => await CenterService.getCenterDetails(centerId)
    },

    Mutation: {
        createCenter: async (_, args, context) => {
            const centerData = {
                ...args,
                centerManagerId: context.userId || "USER-ADMIN",
                // Map từ arg GraphQL (imageFileIds) sang DB model (image_file_ids)
                image_file_ids: args.imageFileIds || [],
                logo_file_id: args.logoFileId
            };
            return await CenterService.createCenter(centerData.centerManagerId, centerData);
        },

        updateCenter: async (_, { centerId, data }) => {
            // Map data từ input GraphQL sang DB model
            const dbUpdateData = {
                ...data,
                image_file_ids: data.imageFileIds,
                logo_file_id: data.logoFileId
            };
            // Xóa các field camelCase thừa để không ghi rác vào DB (nếu dùng strict mode)
            delete dbUpdateData.imageFileIds;
            delete dbUpdateData.logoFileId;

            return await CenterService.updateCenterInfo(centerId, dbUpdateData);
        },

        deleteCenter: async (_, { centerId }) => {
            return await CenterService.deleteCenter(centerId);
        }
    },

    Center: {
        // Field Resolver cho Schema 'logoFileId' (camelCase)
        // Lấy dữ liệu từ parent.logo_file_id (DB snake_case)
        logoFileId: (parent) => parent.logo_file_id,

        // Field Resolver cho Schema 'imageFileIds' (camelCase)
        imageFileIds: (parent) => parent.image_file_ids,

        logoUrl: async (parent) => {
            if (!parent.logo_file_id) return DEFAULT_LOGO_URL;
            try {
                const urlMap = await getBulkUrls([parent.logo_file_id]);
                // SỬA ĐỔI: TRUY CẬP TRỰC TIẾP URL TỪ MAP
                return urlMap[parent.logo_file_id] || DEFAULT_LOGO_URL;
            } catch (e) { return DEFAULT_LOGO_URL; }
        },

        imageUrlList: async (parent) => {
            if (!parent.image_file_ids?.length) return [];
            try {
                const urlMap = await getBulkUrls(parent.image_file_ids);
                console.log('Image URL Map:', urlMap);
                // SỬA ĐỔI: TRUY CẬP TRỰC TIẾP URL TỪ MAP
                return parent.image_file_ids.map(id => urlMap[id]).filter(url => url);
            } catch (e) { return []; }
        }
    }
};