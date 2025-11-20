import { Router } from "express";
// 💡 Import Controller dạng class y như cách bạn làm
import { JobController } from "../controllers/job.controller.js"; 

// Import Middleware bảo mật bạn đã tạo
import { checkInternalJobSecret } from '../middlewares/job.middleware.js';

const jobRouter = Router();

// Định nghĩa route cho job
// K8s CronJob sẽ gọi vào endpoint này
jobRouter.post(
    '/run-cleanup', 
    checkInternalJobSecret,       // Bước 1: Kiểm tra chìa khóa
    JobController.handleCleanupJob  // Bước 2: Gọi static method từ Controller
);

export { jobRouter };