import express from "express";
import cors from "cors";
import { PORT, AUTH_SERVICE_URL, FRONTEND_ORIGIN } from "./config/index.js";
import apiRouter from "./routes/index.js";
import helmet from "helmet";
const app = express();

// Global middleware
app.use(cors(
    { 
        origin: FRONTEND_ORIGIN, // Thay vì 'true', chỉ định rõ origin của Frontend
        credentials: true,       // Bật gửi và nhận cookies (cần cho Refresh Token)
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'], // Cho phép tất cả các method cần thiết
        allowedHeaders: ['Content-Type', 'Authorization'], // Các headers được phép
    }
));
app.use(express.json());
// Cấu hình CSP
app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                // Mặc định, chỉ cho phép tải từ chính domain
                defaultSrc: ["'self'"], 
                // Quan trọng: Chỉ cho phép script từ chính domain, cấm script inline
                scriptSrc: ["'self'", "'unsafe-eval'"], // 'unsafe-eval' thường cần cho React Dev/Build, nhưng nên loại bỏ khi production
                // Nếu bạn chỉ dùng Access Token qua Header (chống XSS), 
                // bạn có thể hạn chế nguồn kết nối (cho phép gọi các Microservice)
                connectSrc: ["'self'", AUTH_SERVICE_URL],
                // Cấm các iframe không an toàn
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
  res.status(500).json({ message: "Internal Gateway Error" });
});

// Start server
app.listen(PORT, () => {
  console.log("-------------------------------------------------");
  console.log(`✅ API Gateway running at http://localhost:${PORT}`);
  console.log("-------------------------------------------------");
});
