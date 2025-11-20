// Middleware này sẽ đọc biến môi trường
// và kiểm tra header 'x-job-secret'

export const checkInternalJobSecret = (req, res, next) => {
    try {
        const secretHeader = req.headers['x-job-secret'];

        // Lấy secret từ biến môi trường
        const expectedSecret = process.env.INTERNAL_JOB_SECRET;

        if (!secretHeader || secretHeader !== expectedSecret) {
            console.warn('[AUTH] Thất bại: Job gọi API với secret không hợp lệ.');
            return res.status(401).send('Unauthorized');
        }

        // Nếu khớp, cho phép request đi tiếp
        next();

    } catch (error) {
        res.status(500).send('Internal Server Error');
    }
};