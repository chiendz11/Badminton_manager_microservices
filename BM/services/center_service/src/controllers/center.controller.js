// src/controllers/center.controller.js

import CenterService from '../services/center.service.js'; 
// import { Center } from '../models/center.model.js'; // Có thể bỏ nếu không dùng trực tiếp model ở controller

const handleError = (res, error) => {
    console.error(`[CenterController] Error:`, error.message);
    const statusCode = error.cause || 500; 
    if (error.message.includes('duplicate key')) {
        return res.status(409).json({ message: 'Dữ liệu trung tâm đã tồn tại (trùng lặp ID/Tên).' });
    }
    return res.status(statusCode).json({ message: error.message });
};

// ----------------------------------------------------------------
// 1. CREATE CENTER
// ----------------------------------------------------------------
export const createCenter = async (req, res) => {
    const { centerManagerId, name, address, ...otherData } = req.body; 
    
    if (!name || !address || !centerManagerId) {
        return res.status(400).json({ message: 'Tên, địa chỉ và Center Manager ID là bắt buộc.' });
    }

    try {
        const center = await CenterService.createCenter(centerManagerId, { name, address, ...otherData });

        return res.status(201).json({
            message: 'Trung tâm được tạo thành công.',
            center // Raw data: { centerId, name, logo_file_id... }
        });

    } catch (error) {
        handleError(res, error);
    }
};

// ----------------------------------------------------------------
// 2. GET ALL CENTERS
// ----------------------------------------------------------------
export const getAllCenters = async (req, res) => {
    try {
        const centers = await CenterService.getAllCenters(); 
        return res.status(200).json(centers);
    } catch (error) {
        handleError(res, error);
    }
};

// ----------------------------------------------------------------
// 3. GET CENTER DETAILS
// ----------------------------------------------------------------
export const getCenterById = async (req, res) => {
    try {
        const { centerId } = req.params;
        const center = await CenterService.getCenterDetails(centerId);
        return res.status(200).json(center);
    } catch (error) {
        handleError(res, error);
    }
};

// ----------------------------------------------------------------
// 4. UPDATE LOGO
// ----------------------------------------------------------------
export const updateCenterLogo = async (req, res) => {
    const { centerId } = req.params;
    const { new_logo_file_id } = req.body; 
    
    if (!new_logo_file_id) {
        return res.status(400).json({ message: 'File ID mới là bắt buộc.' });
    }

    try {
        const center = await CenterService.updateCenterLogo(centerId, new_logo_file_id);

        return res.status(200).json({ 
            message: 'Logo trung tâm được cập nhật.',
            center
        });

    } catch (error) {
        handleError(res, error);
    }
};

// ----------------------------------------------------------------
// 5. ADD IMAGE TO GALLERY
// ----------------------------------------------------------------
export const addCenterImage = async (req, res) => {
    try {
        const { centerId } = req.params;
        const { new_file_id } = req.body; 
        
        if (!new_file_id) {
            return res.status(400).json({ message: 'ID file mới là bắt buộc.' });
        }

        const center = await CenterService.addImageToGallery(centerId, new_file_id);

        return res.status(200).json({ 
            message: 'Đã thêm ảnh vào gallery thành công.', 
            center
        });
        
    } catch (error) {
        handleError(res, error);
    }
};

// ----------------------------------------------------------------
// 6. DELETE IMAGE FROM GALLERY
// ----------------------------------------------------------------
export const deleteCenterImage = async (req, res) => {
    try {
        const { centerId, fileId } = req.params;
        
        const center = await CenterService.removeImageFromGallery(centerId, fileId);

        return res.status(200).json({ 
            message: 'Đã xóa ảnh khỏi gallery và Storage thành công.', 
            center 
        });
        
    } catch (error) {
        handleError(res, error);
    }
};