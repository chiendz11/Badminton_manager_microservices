import express from "express";
import { PORT, AUTH_SERVICE_URL, FRONTEND_ORIGIN, ADMIN_ORIGIN } from "./src/configs/env.config.js";
import apiRouter from "./src/routes/index.route.js"; // Chứa các REST routes cũ
import helmet from "helmet";
import cors from "cors";

// 💡 1. IMPORT HÀM KHỞI TẠO APOLLO SERVER (GraphQL setup)
import { startApolloServer } from './src/graphql.setup.js';

const app = express();

// -----------------------------------------------------------
// 💡 THÊM ROUTE KIỂM TRA (Health Check/REST Test)
// Điều này chứng minh Express Middleware đang hoạt động
// -----------------------------------------------------------
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        service: 'API Gateway',
        mode: 'Hybrid (REST + GraphQL)'
    });
});


// Global middleware
// 💡 SỬ DỤNG MIDDLEWARE CORS TẬP TRUNG ĐẦU TIÊN
app.use(cors(
    {
        origin: [FRONTEND_ORIGIN, ADMIN_ORIGIN],       // Sử dụng địa chỉ cụ thể của Frontend và Admin
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-User-ID', 'X-User-Role'], // Các headers được phép (Thêm headers nội bộ nếu cần test)
    }
));

app.use(express.json());
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-eval'"],
            // Thêm URL của Apollo Studio để Playground hoạt động
            connectSrc: ["'self'", AUTH_SERVICE_URL, FRONTEND_ORIGIN, ADMIN_ORIGIN, "https://studio.apollographql.com"], 
            frameAncestors: ["'none'"],
        },
    },
}));

// -----------------------------------------------------------
// 2. ROUTES REST
// Các route REST cũ (User, Booking,...) vẫn chạy bình thường.
// -----------------------------------------------------------
app.use("/api", apiRouter);

// Error handler
app.use((err, req, res, next) => {
    console.error("[Gateway Error]", err.stack);
    // Nếu lỗi có status code, sử dụng nó
    const status = err.status || 500;
    res.status(status).json({ message: err.message || "Internal Gateway Error" });
});

// -----------------------------------------------------------
// 💡 3. KHỞI ĐỘNG HYBRID SERVER (REST + GraphQL)
// -----------------------------------------------------------
// Gọi hàm startApolloServer để khởi tạo Apollo Server (gắn vào Express app) 
// và nhận về httpServer để lắng nghe cổng.
startApolloServer(app).then((httpServer) => {
    // Bắt đầu lắng nghe HTTP server
    httpServer.listen(PORT, () => {
        console.log("-------------------------------------------------");
        console.log(`✅ API Gateway (Hybrid) running at http://localhost:${PORT}`);
        // Log bổ sung để khẳng định
        console.log(`📡 REST (Proxy) routes are active (Test at: http://localhost:${PORT}/health)`);
        console.log(`🚀 GraphQL Playground at http://localhost:${PORT}/graphql`);
        console.log("-------------------------------------------------");
    });
});