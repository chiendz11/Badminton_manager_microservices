import express from 'express';
import multer from 'multer';
import { 
    uploadNewFile, 
    deleteFileById, 
    getFileUrlById,
    getFilesUrlByIds // 💡 IMPORT Controller này
} from '../controllers/storage.controller.js';
import { internalAuth } from '../middlewares/internalAuth.middleware.js'; 

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// -----------------------------------------------------------------
// Tuyến đường nội bộ (Yêu cầu xác thực Internal Auth)
// Prefix gốc từ app.js là: /api/v1/storage
// -----------------------------------------------------------------

// API 1: Upload file mới
router.post('/upload', internalAuth, upload.single('file'), uploadNewFile);

// API 2: Lấy danh sách URL (Bulk) - 💡 THÊM ROUTE NÀY
// Endpoint thực tế: POST /api/v1/storage/bulk-urls
router.post('/bulk-urls', internalAuth, getFilesUrlByIds);

// API 3: Xóa file
router.delete('/:fileId', internalAuth, deleteFileById); 

// API 4: Lấy URL file đơn lẻ
router.get('/:fileId', internalAuth, getFileUrlById); 

export default router;