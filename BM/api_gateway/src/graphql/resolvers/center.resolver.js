// Loại bỏ import axios và configs không cần thiết (đã chuyển sang Data Sources)
// Giữ lại DEFAULT_LOGO_URL
const DEFAULT_LOGO_URL = 'https://res.cloudinary.com/default/default-logo.png';

// -----------------------------------------------------------
// 💡 Center Resolver Definition
// -----------------------------------------------------------
export const resolvers = {
    Query: {
        // Resolver cho Query 'centers' (Lấy danh sách)
        centers: async (parent, args, context) => {
            console.log(`[GraphQL] Fetching all centers for user: ${context.userId}`);
            // SỬ DỤNG DATA SOURCE CenterAPI
            try {
                return await context.dataSources.centerAPI.getAllCenters();
            } catch (error) {
                console.error('Error in centers resolver:', error.message);
                throw new Error(error.message || 'Could not fetch centers.');
            }
        },
        
        // Resolver cho Query 'center' (Lấy chi tiết)
        center: async (parent, { centerId }, context) => {
            console.log(`[GraphQL] Fetching center detail: ${centerId}`);
            // SỬ DỤNG DATA SOURCE CenterAPI
            try {
                return await context.dataSources.centerAPI.getCenterById(centerId);
            } catch (error) {
                console.error(`Error in center resolver for ID ${centerId}:`, error.message);
                throw new Error(error.message || `Could not fetch center ${centerId}.`);
            }
        },
    },

    Mutation: {
        // Resolver cho Mutation 'createCenter'
        createCenter: async (parent, { name, address, logoFileId }, context) => {
            // Logic Authorization (vẫn giữ nguyên ở Resolver)
            if (context.userRole !== 'SUPER_ADMIN' && context.userRole !== 'CENTER_MANAGER') {
                throw new Error('Unauthorized: Must be an admin or manager to create a center.');
            }

            // SỬ DỤNG DATA SOURCE CenterAPI
            try {
                // Truyền data và context (chứa thông tin user)
                const data = { name, address, logo_file_id: logoFileId };
                return await context.dataSources.centerAPI.createCenter(data, context);
            } catch (error) {
                console.error('Error in createCenter resolver:', error.message);
                throw new Error(error.message || 'Could not create center.');
            }
        }
    },

    // -----------------------------------------------------------
    // 💡 FIELD-LEVEL RESOLVER (Aggregation Logic)
    // -----------------------------------------------------------
    Center: {
        // Resolver cho trường 'logoUrl'
        logoUrl: async (parent, args, context) => {
            const fileId = parent.logo_file_id;
            
            if (!fileId) {
                return DEFAULT_LOGO_URL; // Trả về logo mặc định
            }
            
            // 💡 SỬ DỤNG DATA SOURCE StorageAPI ĐÃ INJECT VÀO CONTEXT
            try {
                const urlMap = await context.dataSources.storageAPI.fetchBulkUrls([fileId]);
                return urlMap[fileId] || DEFAULT_LOGO_URL;
            } catch (e) {
                console.error("Error resolving logoUrl:", e);
                return DEFAULT_LOGO_URL;
            }
        },
        
        // Resolver cho trường 'imageUrlList' (Gallery)
        // ⚠️ QUAN TRỌNG: Phải nằm TRONG object Center
        imageUrlList: async (parent, args, context) => {
            // Lấy mảng ID từ parent (dữ liệu thô từ Center Service)
            const fileIds = parent.image_file_ids;

            // Nếu không có ảnh nào, trả về mảng rỗng
            if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
                return [];
            }

            try {
                // Gọi StorageAPI để lấy Map { id: url }
                const urlMap = await context.dataSources.storageAPI.fetchBulkUrls(fileIds);

                // Map lại từ mảng ID sang mảng URL
                // Nếu ID nào không tìm thấy URL, ta lọc bỏ (filter)
                return fileIds.map(id => urlMap[id]).filter(url => url !== undefined);
            } catch (error) {
                console.error("Error resolving imageUrlList:", error);
                return []; // Trả về mảng rỗng nếu lỗi service
            }
        },

        // Alias cho trường thô: Map trường DB (snake_case) sang GraphQL (camelCase)
        logoFileId: (parent) => parent.logo_file_id 
    }
};