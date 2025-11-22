import FormData from 'form-data';
import { STORAGE_SERVICE_URL } from '../configs/env.config.js';
// 💡 1. Import "Nhà máy"
import { createInternalApiClient } from '../utils/internal.api.js';

// 💡 2. Yêu cầu một client được cấu hình sẵn cho Storage Service
const storageApi = createInternalApiClient(STORAGE_SERVICE_URL);

/**
 * @description Upload file (dạng Buffer) lên Storage Service nội bộ.
 */
const uploadFile = async (fileBuffer, originalname, userId, fileType) => {
    const formData = new FormData();

    formData.append('file', fileBuffer, {
        filename: originalname,
        contentType: 'application/octet-stream',
    });

    formData.append('uploaderId', userId);
    formData.append('fileType', fileType);
    formData.append('tags', 'profile,avatar');

    try {
        // 💡 3. Vẫn gọi bình thường, nhưng dùng instance từ factory
        const response = await storageApi.post('/api/v1/files', formData, {
            headers: formData.getHeaders(),
            timeout: 30000, // Có thể ghi đè timeout cho riêng tác vụ upload
        });

        const fileMetadata = response.data.file;
        return {
            publicFileId: fileMetadata.publicFileId,
            publicUrl: fileMetadata.publicUrl,
        };

    } catch (error) {
        console.error('[StorageClient] Lỗi khi gọi Internal Upload:', error.response?.data || error.message);
        throw new Error('Lỗi gọi Storage Service nội bộ: Upload thất bại.');
    }
};

/**
 * @description Xóa file cũ khỏi Storage Service nội bộ.
 */
const deleteFile = async (fileId) => {
    if (!fileId || fileId.startsWith('DEFAULT')) {
        console.log(`[StorageClient] Bỏ qua xóa file: ${fileId} là ID mặc định.`);
        return;
    }

    try {
        // 💡 4. Vẫn gọi bình thường
        await storageApi.delete(`/api/v1/${fileId}`);
        console.log(`[StorageClient] ✅ Đã gửi yêu cầu xóa file cũ: ${fileId}`);
    } catch (error) {
        console.warn('[StorageClient] ⚠️ Cảnh báo: Xóa file cũ thất bại:', error.response?.data || error.message);
    }
};

export const StorageClient = {
    uploadFile,
    deleteFile
};