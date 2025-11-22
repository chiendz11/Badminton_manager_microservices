// routes/center.route.js

import express from 'express';
import { 
    createCenter, 
    getAllCenters,
    getCenterById,      // 💡 Thêm: Lấy chi tiết Center
    updateCenterLogo, 
    addCenterImage,     // 💡 Thêm: Thêm ảnh vào Gallery
    deleteCenterImage,
    uploadCenterImage  // 💡 Thêm: Xóa ảnh khỏi Gallery
    // ... thêm các controller khác như updateCenterInfo, etc.
} from '../controllers/center.controller.js';
import { internalAuth } from '../middlewares/internalAuth.middleware.js'; 
import multer from 'multer'; // Cần cài: npm install multer

const router = express.Router();
// Sử dụng memoryStorage để giữ file trong RAM tạm thời trước khi bắn sang Storage Service
const upload = multer({ storage: multer.memoryStorage() });
// 1. CREATE Center (Private/Manager)
// 💡 Endpoint Upload: Frontend gọi vào đây
router.post('/:centerId/files', internalAuth, upload.single('file'), uploadCenterImage);


export default router;