import axios from 'axios';

/**
 * Lớp chịu trách nhiệm giao tiếp với Center Microservice
 * (Thông qua REST API, sử dụng Axios)
 */
export class CenterAPI {
    constructor() {
        // Cấu hình Base URL cho Microservice này
        this.baseURL = process.env.CENTER_SERVICE_URL || 'http://localhost:3001/api/v1';
        this.http = axios.create({
            baseURL: this.baseURL,
            timeout: 5000,
        });
        
        // Bạn có thể thiết lập interceptors ở đây để tự động thêm Auth Header.
        this.http.interceptors.request.use((config) => {
            // Ví dụ: Lấy token từ context hoặc biến toàn cục nếu cần
            // config.headers['Authorization'] = `Bearer ${this.token}`;
            return config;
        });
    }

    /**
     * Lấy thông tin chi tiết của một Center bằng ID
     * @param {string} centerId ID của trung tâm
     * @returns {Promise<Object>} Dữ liệu Center
     */
    async getCenterById(centerId) {
        try {
            const response = await this.http.get(`/centers/${centerId}`);
            return response.data;
        } catch (error) {
            console.error(`Error fetching center ${centerId}:`, error.message);
            // Quan trọng: Xử lý lỗi và có thể re-throw lỗi chuẩn GraphQL
            throw new Error(`Cannot connect to Center Service or Center not found.`);
        }
    }

    /**
     * Lấy danh sách tất cả Centers
     * @returns {Promise<Array>} Danh sách Centers
     */
    async getAllCenters() {
        try {
            const response = await this.http.get(`/centers`);
            return response.data;
        } catch (error) {
            console.error('Error fetching all centers:', error.message);
            throw new Error(`Cannot connect to Center Service.`);
        }
    }

    // TODO: Thêm các phương thức khác như createCenter, updateCenter, getCourtsByCenterId...
}