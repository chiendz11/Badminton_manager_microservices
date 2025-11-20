// src/clients/storage.client.js

// 💡 Import instance đã tạo từ utils
import internalAxios from '../utils/internal.api.js'; 
import { envConfig } from '../configs/env.config.js';

// Vẫn cần Base URL của Storage Service
const STORAGE_URL = envConfig.STORAGE_SERVICE_URL;

/**
 * @description Lấy Public URL cho nhiều File ID (Bulk-get API).
 */
export const getBulkUrls = async (fileIds) => {
    try {
        // 💡 Chỉ cần gọi internalAxios.post và truyền Endpoint
        const response = await internalAxios.post(
            `${STORAGE_URL}/bulk-urls`,
            { fileIds }
        );
        return response.data;
    } catch (error) {
        console.error("[StorageClient] Lỗi khi gọi Bulk URLs:", error.message);
        throw new Error('Failed to fetch file URLs from Storage Service.', { cause: 503 }); 
    }
};

/**
 * @description Yêu cầu Storage Service xóa một file cụ thể (DELETE API).
 */
export const deleteFile = async (fileId) => {
    try {
        // 💡 Chỉ cần gọi internalAxios.delete và truyền Endpoint
        await internalAxios.delete(`${STORAGE_URL}/${fileId}`);
    } catch (error) {
        console.warn(`[StorageClient] WARNING: Failed to delete file ID ${fileId}:`, error.message);
    }
};