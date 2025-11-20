import { Router } from 'express';
import multer from 'multer'; // 💡 IMPORT MULTER
import { UserController } from '../controllers/user.controller.js'; 

const router = Router();

// 💡 CẤU HÌNH MULTER: Chỉ lưu trữ trong bộ nhớ (memory storage)
// Vì đây là Microservice (User Service), nó sẽ dùng buffer này để PROXY
// gửi đến Storage Service thực tế.
const storage = multer.memoryStorage();
// Giới hạn chỉ chấp nhận 1 file tên 'avatar' và kích thước tối đa 5MB.
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});


// ----------------------------------------------------
// API PROFILE
// ----------------------------------------------------

// GET /me: Lấy thông tin profile của người dùng hiện tại
router.get('/me', UserController.getMe); 

// PATCH /me: Cập nhật thông tin profile (JSON: name, phone_number...)
router.patch('/me', UserController.updateProfile); 

// 💡 ENDPOINT MỚI: PUT /me/avatar (Mô hình Proxy)
// Cập nhật ảnh đại diện (dùng multipart/form-data)
router.put(
    '/me/avatar', 
    upload.single('avatar'), // 💡 MULTER xử lý file với field name là 'avatar'
    UserController.updateAvatar // Controller xử lý file
); 

export default router;