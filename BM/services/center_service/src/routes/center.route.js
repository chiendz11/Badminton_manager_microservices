// routes/center.route.js

import express from 'express';
import { 
    createCenter, 
    getAllCenters,
    getCenterById,      // 💡 Thêm: Lấy chi tiết Center
    updateCenterLogo, 
    addCenterImage,     // 💡 Thêm: Thêm ảnh vào Gallery
    deleteCenterImage,
    uploadCenterImage,
    getCourtById  // 💡 Thêm: Xóa ảnh khỏi Gallery
    // ... thêm các controller khác như updateCenterInfo, etc.
} from '../controllers/center.controller.js';
import { internalAuth } from '../middlewares/internalAuth.middleware.js'; 
import multer from 'multer'; // Cần cài: npm install multer

const router = express.Router();
// Sử dụng memoryStorage để giữ file trong RAM tạm thời trước khi bắn sang Storage Service
const upload = multer({ storage: multer.memoryStorage() });
// 1. CREATE Center (Private/Manager)
// 💡 Endpoint Upload: Frontend gọi vào đây
router.get('/', getAllCenters);

// 2. Lấy chi tiết một center
// GET /api/centers/:centerId
router.get('/:centerId', getCenterById);


// =================================================================
// PROTECTED ROUTES (Cần quyền Internal/Manager/Admin)
// =================================================================

// 3. Tạo mới Center
// POST /api/centers
router.post('/', internalAuth, createCenter);

// 4. Upload file vật lý (Logo hoặc Gallery Image) lên Storage
// Route này trả về fileId, sau đó Frontend dùng fileId này để gọi route update logo hoặc add gallery
// POST /api/centers/:centerId/files
router.post('/:centerId/files', internalAuth, upload.single('file'), uploadCenterImage);

// 5. Cập nhật Logo (Lưu fileId vào DB)
// PUT /api/centers/:centerId/logo
router.put('/:centerId/logo', internalAuth, updateCenterLogo);

// 6. Thêm ảnh vào Gallery (Lưu fileId vào mảng gallery trong DB)
// POST /api/centers/:centerId/gallery
router.post('/:centerId/gallery', internalAuth, addCenterImage);

// 7. Xóa ảnh khỏi Gallery (Xóa fileId khỏi mảng DB và xóa file trên Storage)
// DELETE /api/centers/:centerId/gallery/:fileId
router.delete('/:centerId/gallery/:fileId', internalAuth, deleteCenterImage);

router.get('/courts/:courtId', getCourtById);


export default router;