import { runCleanupJobs } from '../services/job.service.js';

/**
 * JobController xử lý các request liên quan đến
 * các tác vụ nền (background jobs).
 */
export class JobController {
    static handleCleanupJob = async (req, res) => {
        // 💡 Quan trọng:
        // Chạy service ngầm (không 'await') để giải phóng
        // request của K8s ngay lập tức.
        runCleanupJobs(); 
        
        // Trả lời '202 Accepted' để K8s biết là "Đã nhận lệnh"
        res.status(202).send('Cleanup job accepted.');
    };

    // Tương lai nếu có job khác (ví dụ: gửi báo cáo)
    // bạn có thể thêm static method mới ở đây
    // static handleSendReports = async (req, res) => { ... };
}