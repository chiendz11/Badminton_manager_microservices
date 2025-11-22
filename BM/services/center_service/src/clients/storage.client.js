import axios from 'axios';
import FormData from 'form-data';
import { envConfig } from '../configs/env.config.js';

// URL của Storage Service
const STORAGE_BASE_URL = envConfig.STORAGE_SERVICE_URL || 'http://localhost:5002/api/v1/storage';

// Header xác thực nội bộ
const getInternalHeaders = () => ({
    'x-service-secret': envConfig.INTERNAL_AUTH_SECRET,
    'x-service-name': 'center-service',
});

/**
 * @description Upload File (Proxy) lên Storage Service
 * @param {Buffer} fileBuffer Dữ liệu file
 * @param {string} originalName Tên file gốc
 * @param {string} fileType Loại file (vd: 'center_logo', 'court_image')
 * @param {string} uploaderId ID người dùng/entity upload
 * @param {string} [entityId] ID thực thể liên quan (vd: centerId, dùng để phân thư mục)
 * @returns {Promise<object>} Đối tượng file đã lưu ({ publicFileId, publicUrl, ... })
 */
export const uploadFileToStorage = async (fileBuffer, originalName, fileType, uploaderId, entityId) => {
    try {
        const formData = new FormData();
        formData.append('file', fileBuffer, originalName);
        formData.append('uploaderId', uploaderId);
        formData.append('fileType', fileType);
        // ✅ Truyền entityId để Storage Service sử dụng trong việc tạo folder trên Cloudinary
        if (entityId) formData.append('entityId', entityId); 
        formData.append('tags', 'center-service-upload');

        const response = await axios.post(`${STORAGE_BASE_URL}/files`, formData, {
            headers: {
                ...getInternalHeaders(),
                ...formData.getHeaders()
            },
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });

        return response.data.file; // { publicFileId, publicUrl, ... }
    } catch (error) {
        console.error('[StorageClient] Upload Error:', error.response?.data || error.message);
        throw new Error('Failed to upload file to Storage Service.');
    }
};

// 2. Delete File
export const deleteFileFromStorage = async (fileId) => {
    try {
        await axios.delete(`${STORAGE_BASE_URL}/${fileId}`, {
            headers: getInternalHeaders()
        });
        return true;
    } catch (error) {
        console.warn(`[StorageClient] Delete Warning: ${error.message}`);
        return false;
    }
};

// 3. Get Bulk URLs
export const getBulkUrls = async (fileIds) => {
    if (!fileIds || !fileIds.length) return {};
    try {
        const response = await axios.post(`${STORAGE_BASE_URL}/bulk-urls`, { fileIds }, {
            headers: getInternalHeaders()
        });
        const map = {};
        response.data.forEach(item => { if(item.publicFileId) map[item.publicFileId] = item.publicUrl; });
        return map;
    } catch (error) {
        console.error('[StorageClient] Bulk URL Error:', error.response?.data || error.message);
        return {};
    }
};