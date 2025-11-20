import axios from 'axios';
import { STORAGE_SERVICE_URL, INTERNAL_AUTH_SECRET } from '../configs/env.config.js';

const GATEWAY_SERVICE_NAME = 'graphql-gateway';

export class StorageAPI {
    constructor() {
        // Fallback port 5002 nếu chưa config
        this.baseURL = STORAGE_SERVICE_URL || 'http://localhost:5002'; 
        
        console.log(`[StorageAPI] Initialized with Base URL: ${this.baseURL}`);

        this.http = axios.create({
            baseURL: this.baseURL,
            timeout: 5000,
            headers: {
                'Content-Type': 'application/json',
                'X-Service-Secret': INTERNAL_AUTH_SECRET,
                'X-Service-Name': GATEWAY_SERVICE_NAME,
            }
        });
    }

    /**
     * Lấy danh sách URL công khai cho nhiều File ID.
     * @param {Array<string>} fileIds Danh sách các public file ID.
     * @returns {Promise<Object>} Map (ID -> URL).
     */
    async fetchBulkUrls(fileIds) {
        if (!fileIds || fileIds.length === 0) return {};

        try {
            // 💡 SỬA LỖI 1: Gọi đúng prefix /api/v1/storage khớp với app.js
            const endpoint = '/api/v1/storage/bulk-urls';
            
            // 💡 SỬA LỖI 2: Gửi key là 'fileIds' để khớp với Controller (const { fileIds } = req.body)
            const payload = { fileIds: fileIds };

            console.log(`[StorageAPI] POST ${this.baseURL}${endpoint}`, payload);

            const storageResponse = await this.http.post(endpoint, payload);
            
            // Kiểm tra dữ liệu trả về có đúng là mảng không
            if (!Array.isArray(storageResponse.data)) {
                console.warn('[StorageAPI] Unexpected response format:', storageResponse.data);
                return {};
            }

            // Trả về Map (ID -> URL)
            return storageResponse.data.reduce((map, item) => {
                if (item.publicFileId && item.publicUrl) {
                    map[item.publicFileId] = item.publicUrl;
                }
                return map;
            }, {});

        } catch (error) {
            if (error.response) {
                console.error(`[StorageAPI] 🔥 Upstream Error ${error.response.status}:`, JSON.stringify(error.response.data));
            } else if (error.request) {
                console.error(`[StorageAPI] ❌ No Response from ${this.baseURL}. Is Storage Service running?`);
            } else {
                console.error('[StorageAPI] Error:', error.message);
            }
            // Trả về rỗng để không làm sập cả query GraphQL
            return {}; 
        }
    }
}