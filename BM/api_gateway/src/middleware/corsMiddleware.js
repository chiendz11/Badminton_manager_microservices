// api_gateway/src/middleware/safeCorsMiddleware.js

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';

export const safeEnforceCors = (req, res, next) => {
    const requestOrigin = req.header('Origin');

    // 💡 BƯỚC 1: KIỂM TRA ORIGIN
    if (requestOrigin === FRONTEND_ORIGIN) {
        // CHỈ THỰC THI NẾU KHỚP VỚI NGUỒN GỐC ĐƯỢC PHÉP
        res.header('Access-Control-Allow-Origin', FRONTEND_ORIGIN);
        res.header('Access-Control-Allow-Credentials', 'true');
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
        
        // Xử lý Preflight (OPTIONS)
        if (req.method === 'OPTIONS') {
            return res.sendStatus(204);
        }
    } 
    // Nếu Origin không khớp, KHÔNG làm gì cả. (Không gán header ACAO)

    // DÙ Origin có khớp hay không, yêu cầu vẫn được chuyển tiếp.
    // Nếu nó không khớp, FE sẽ gặp lỗi CORS, đó là hành vi bảo mật mong muốn.
    next();
};