// routes/center.route.js

import express from 'express';
import { 
    createCenter, 
    getAllCenters,
    getCenterById,      // 💡 Thêm: Lấy chi tiết Center
    updateCenterLogo, 
    addCenterImage,     // 💡 Thêm: Thêm ảnh vào Gallery
    deleteCenterImage,  // 💡 Thêm: Xóa ảnh khỏi Gallery
    // ... thêm các controller khác như updateCenterInfo, etc.
} from '../controllers/center.controller.js';
import { internalAuth } from '../middlewares/internalAuth.middleware.js'; 

const router = express.Router();

// 1. CREATE Center (Private/Manager)
router.post('/', internalAuth, createCenter); 

// 2. GET All Centers (Public)
router.get('/', getAllCenters);

// 3. GET Center Details (Public - Dùng cho CenterDetailModal)
router.get('/:centerId', getCenterById); 

// 4. LOGO MANAGEMENT (Private/Manager)
router.put('/:centerId/logo', internalAuth, updateCenterLogo); 

// 5. GALLERY MANAGEMENT (Private/Manager)
// Thêm ảnh vào gallery
router.post('/:centerId/images', internalAuth, addCenterImage); 

// Xóa ảnh khỏi gallery
router.delete('/:centerId/images/:fileId', internalAuth, deleteCenterImage); 


export default router;