import axios from 'axios';
import { CENTER_SERVICE_URL, INTERNAL_AUTH_SECRET } from '../configs/env.config.js';

const GATEWAY_SERVICE_NAME = 'graphql-gateway';

export class CenterAPI {
    constructor() {
        // CENTER_SERVICE_URL nên là host gốc (ví dụ: http://localhost:3001)
        this.baseURL = CENTER_SERVICE_URL || 'http://localhost:3001'; 
        
        console.log(`[CenterAPI] Initialized with Base URL: ${this.baseURL}`);

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

    async getAllCenters() {
        try {
            // 💡 SỬA LỖI QUAN TRỌNG: 
            // App.js định nghĩa: app.use('/api/v1/centers', ...)
            // Nên Gateway phải gọi: /api/v1/centers
            const endpoint = '/api/v1/centers'; 
            
            console.log(`[CenterAPI] Calling GET ${this.baseURL}${endpoint} ...`);
            const response = await this.http.get(endpoint);
            return response.data;
        } catch (error) {
            if (error.response) {
                console.error(`[CenterAPI] 🔥 Upstream Error ${error.response.status}:`, JSON.stringify(error.response.data));
                throw new Error(`Center Service Error (${error.response.status}): ${error.response.data.message || 'Unknown error'}`);
            } else if (error.request) {
                console.error(`[CenterAPI] ❌ No Response from ${this.baseURL}. Is Center Service running?`);
                throw new Error(`Cannot connect to Center Service at ${this.baseURL}. Check your .env file.`);
            } else {
                console.error('[CenterAPI] Request Error:', error.message);
                throw error;
            }
        }
    }

    async getCenterById(centerId) {
        try {
            // 💡 SỬA LỖI: Thêm /api/v1
            const response = await this.http.get(`/api/v1/centers/${centerId}`);
            return response.data;
        } catch (error) {
             if (error.response && error.response.status === 404) return null;
             console.error(`[CenterAPI] Error fetching center ${centerId}:`, error.message);
             throw new Error('Failed to fetch center details.');
        }
    }
    
    async createCenter(data, userContext) {
         try {
            // 💡 SỬA LỖI: Thêm /api/v1
            const response = await this.http.post(`/api/v1/centers`, data, {
                headers: {
                    'X-User-ID': userContext.userId,
                    'X-User-Role': userContext.userRole
                }
            });
            return response.data;
        } catch (error) {
            console.error('[CenterAPI] Error creating center:', error.message);
            throw new Error('Failed to create center.');
        }
    }
}