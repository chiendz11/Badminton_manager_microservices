import express from "express";
import { PORT, AUTH_SERVICE_URL, FRONTEND_ORIGIN } from "./configs/env.config.js";
import apiRouter from "./routes/index.js";
import helmet from "helmet";
import cors from "cors";
const app = express();

// Global middleware
// 💡 SỬ DỤNG MIDDLEWARE CORS TẬP TRUNG ĐẦU TIÊN
app.use(cors(
    {
        origin: FRONTEND_ORIGIN,       // Sử dụng địa chỉ cụ thể của Frontend
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
        allowedHeaders: ['Content-Type', 'Authorization'], // Các headers được phép
    }));



app.use(express.json());

// Cấu hình CSP
app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'unsafe-eval'"],
                // Cần đảm bảo FRONTEND_ORIGIN được thêm vào connectSrc để tránh lỗi CSP khi Fetch
                connectSrc: ["'self'", AUTH_SERVICE_URL, process.env.FRONTEND_ORIGIN],
                frameAncestors: ["'none'"],
            },
        },
    })
);
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api", apiRouter);

// Error handler
app.use((err, req, res, next) => {
    console.error("[Gateway Error]", err.stack);
    // Nếu lỗi có status code, sử dụng nó
    const status = err.status || 500;
    res.status(status).json({ message: err.message || "Internal Gateway Error" });
});

// Start server
app.listen(PORT, () => {
    console.log("-------------------------------------------------");
    console.log(`✅ API Gateway running at http://localhost:${PORT}`);
    console.log("-------------------------------------------------");
});
