// src/services/center.service.js

import { Center } from '../models/center.model.js';
import { Court } from '../models/court.model.js'; 
import { envConfig } from '../configs/env.config.js';
import { v4 as uuidv4 } from 'uuid';

// 💡 CHỈ GIỮ LẠI HÀM DELETE (Logic ghi/xóa vẫn thuộc về Service này)
import { deleteFile as deleteFileFromStorage } from '../clients/storage.client.js'; 

const DEFAULT_LOGO_FILE_ID = envConfig.DEFAULT_LOGO_FILE_ID;

const CenterService = {

    /**
     * @description Tạo trung tâm mới và gán ID quản lý
     */
    async createCenter(centerManagerId, centerData) {
        const centerId = `CENTER-${uuidv4()}`;

        try {
            const newCenter = new Center({
                centerId,
                centerManagerId,
                ...centerData, 
            });

            await newCenter.save();
            
            // 💡 Trả về raw data (chứa file_id), không cần convert sang URL
            return newCenter.toObject();

        } catch (error) {
            if (error.code === 11000) {
                throw new Error('Center already exists (duplicate key).', { cause: 409 }); 
            }
            throw error;
        }
    },

    /**
     * @description Lấy danh sách tất cả trung tâm (Raw Data)
     */
    async getAllCenters() {
        // 💡 CẬP NHẬT: Lấy thêm các trường cần thiết cho UI List & Modal Preview
        // - googleMapUrl: Để modal hiển thị bản đồ ngay lập tức
        // - totalCourts: Để hiển thị badge số sân bên ngoài
        // - image_file_ids: Để Gateway lấy được list ảnh (imageUrlList) -> chọn làm cover
        // - isActive: Để lọc hoặc hiển thị trạng thái
        const centers = await Center.find()
            .select('centerId name address avgRating bookingCount logo_file_id image_file_ids totalCourts googleMapUrl isActive')
            .lean();
        
        return centers; 
    },
    
    /**
     * @description Lấy chi tiết trung tâm và danh sách sân
     */
    async getCenterDetails(centerId) {
        const center = await Center.findOne({ centerId }).lean();
        if (!center) {
            throw new Error('Center not found.', { cause: 404 });
        }

        const courts = await Court.find({ centerId }).select('-__v').lean();
        
        // Gán courts vào và trả về nguyên bản
        center.courts = courts;

        return center;
    },

    /**
     * @description Cập nhật Logo, xóa file cũ khỏi Storage Service
     */
    async updateCenterLogo(centerId, new_logo_file_id) {
        const center = await Center.findOne({ centerId });
        
        if (!center) {
            throw new Error('Center not found.', { cause: 404 }); 
        }

        const old_logo_file_id = center.logo_file_id;
        
        // 1. Cập nhật Logo ID mới vào DB
        center.logo_file_id = new_logo_file_id;
        await center.save();

        // 2. XÓA FILE CŨ TỪ STORAGE SERVICE (Nghiệp vụ xóa vẫn nằm ở đây)
        if (old_logo_file_id && old_logo_file_id !== DEFAULT_LOGO_FILE_ID) {
            // Fire and forget hoặc await tùy nhu cầu, ở đây await cho an toàn
            await deleteFileFromStorage(old_logo_file_id).catch(err => 
                console.error(`[CenterService] Failed to delete old logo ${old_logo_file_id}:`, err.message)
            );
        }
        
        return center.toObject();
    },
    
    /**
     * @description Thêm ảnh vào Gallery
     */
    async addImageToGallery(centerId, newFileId) {
        const center = await Center.findOneAndUpdate(
            { centerId },
            { $push: { image_file_ids: newFileId } },
            { new: true } 
        ).lean();

        if (!center) throw new Error('Center not found.', { cause: 404 });
        
        return center;
    },

    /**
     * @description Xóa ảnh khỏi Gallery và xóa file vật lý
     */
    async removeImageFromGallery(centerId, fileIdToRemove) {
        const center = await Center.findOne({ centerId });
        if (!center) throw new Error('Center not found.', { cause: 404 });
        
        // Validate nghiệp vụ
        if (center.logo_file_id === fileIdToRemove) {
             throw new Error('Cannot delete: This image is currently set as the center logo.', { cause: 409 });
        }
        
        // 1. Cập nhật DB
        await Center.updateOne(
            { centerId },
            { $pull: { image_file_ids: fileIdToRemove } }
        );
        
        // 2. Gọi Storage Service để xóa file vật lý
        await deleteFileFromStorage(fileIdToRemove).catch(err => 
             console.error(`[CenterService] Failed to delete gallery image ${fileIdToRemove}:`, err.message)
        );

        // 3. Trả về data mới nhất
        const updatedCenter = await Center.findOne({ centerId }).lean();
        return updatedCenter;
    }
};

export default CenterService;