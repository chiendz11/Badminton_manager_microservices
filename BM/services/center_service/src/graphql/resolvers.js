import CenterService from '../services/center.service.js';
import { getBulkUrls } from '../clients/storage.client.js';
import { Court } from '../models/court.model.js'; // Đảm bảo đường dẫn đúng

const DEFAULT_LOGO_URL = 'https://res.cloudinary.com/default/default-logo.png';
// Logo mặc định nếu không có
const FALLBACK_LOGO_ID = "https://res.cloudinary.com/dm4uxmmtg/image/upload/v1762859721/badminton_app/avatars/default_user_avatar.png";

export const resolvers = {
    Query: {
        centers: async () => await CenterService.getAllCenters(),
        center: async (_, { centerId }) => await CenterService.getCenterDetails(centerId)
    },

    Mutation: {
        createCenter: async (_, args, context) => {
            // 1. Chuẩn bị data
            const centerData = {
                ...args, // Bao gồm cả pricing nếu có
                centerManagerId: args.centerManagerId || context.userId || "USER-ADMIN",
                logo_file_id: args.logoFileId || FALLBACK_LOGO_ID, 
                image_file_ids: args.imageFileIds || []
            };
            
            // 2. Cleanup camelCase keys (Mapping sang snake_case cho DB nếu cần thiết)
            // Lưu ý: Nếu Model Mongoose của bạn dùng 'imageFileIds' thì không cần xóa. 
            // Nếu dùng 'image_file_ids' thì xóa như dưới là đúng.
            delete centerData.imageFileIds;
            delete centerData.logoFileId;

            // 3. Gọi Service
            return await CenterService.createCenter(centerData.centerManagerId, centerData);
        },

        updateCenter: async (_, { centerId, data }) => {
            // Clone data
            const dbUpdateData = { ...data };

            // Mapping CamelCase -> snake_case cho Media
            if (data.imageFileIds !== undefined) {
                dbUpdateData.image_file_ids = data.imageFileIds;
                delete dbUpdateData.imageFileIds; 
            }

            if (data.logoFileId !== undefined) {
                dbUpdateData.logo_file_id = data.logoFileId;
                delete dbUpdateData.logoFileId; 
            }

            // Pricing đã nằm trong `data` (do ...data), nên không cần map thủ công
            // dbUpdateData.pricing = data.pricing; 

            return await CenterService.updateCenterInfo(centerId, dbUpdateData);
        },

        deleteCenter: async (_, { centerId }) => {
            return await CenterService.deleteCenter(centerId);
        }
    },

    Center: {
        // Field Resolvers cho các trường tính toán hoặc map tên
        
        logoFileId: (parent) => parent.logo_file_id || parent.logoFileId,
        imageFileIds: (parent) => parent.image_file_ids || parent.imageFileIds,

        // Logic lấy URL ảnh từ ID
        logoUrl: async (parent) => {
            const logoId = parent.logo_file_id || parent.logoFileId;
            if (!logoId) return DEFAULT_LOGO_URL;
            
            // Nếu logoId đã là URL (http...) thì trả về luôn (cho trường hợp fallback)
            if (logoId.startsWith('http')) return logoId;

            try {
                const urlMap = await getBulkUrls([logoId]);
                return urlMap[logoId] || DEFAULT_LOGO_URL;
            } catch (e) { return DEFAULT_LOGO_URL; }
        },

        imageUrlList: async (parent) => {
            const imgIds = parent.image_file_ids || parent.imageFileIds;
            if (!imgIds?.length) return [];
            
            try {
                const urlMap = await getBulkUrls(imgIds);
                return imgIds.map(id => urlMap[id]).filter(url => url);
            } catch (e) { return []; }
        },

        // Resolver cho danh sách sân (1-n)
        courts: async (parent) => {
            try {
                // Tìm sân dựa trên centerId
                return await Court.find({ centerId: parent.centerId });
            } catch (error) {
                console.error("Error resolving courts:", error);
                return [];
            }
        },
    }
};