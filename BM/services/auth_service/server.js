import express from "express";
import mainRouter from "./src/routes/index.route.js";
import { PORT } from "./src/configs/env.config.js"; 
import helmet from "helmet";
import { jobRouter } from './src/routes/job.route.js';
// 💡 1. IMPORT COOKIE-PARSER
import cookieParser from "cookie-parser";

// 1. IMPORT HÀM KẾT NỐI TỪ PRISMA.JS
import { connectAndLog } from "./src/prisma.js";

const app = express();
const AUTH_PORT = PORT; 

// Global middleware
app.use(helmet());
// 💡 2. SỬ DỤNG COOKIE-PARSER (Phải nằm trước 'Routes')
app.use(cookieParser());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api", mainRouter); // Sử dụng mainRouter (từ index.routes.js)
app.use('/internal/jobs', jobRouter);

// Health check
app.get("/", (req, res) => {
    res.json({ service: "Auth Service", status: "running" });
});

// Error handler 
app.use((err, req, res, next) => {
    console.error("[Auth Service Error]", err.stack);
    res.status(500).json({ message: "Internal Auth Service Error" });
});

// 2. TẠO HÀM KHỞI ĐỘNG SERVER BẤT ĐỒNG BỘ
async function startServer() {
    try {
        // 3. CHỜ KẾT NỐI DATABASE THÀNH CÔNG TRƯỚC
        await connectAndLog();

        // 4. SAU KHI DB SẴN SÀNG, MỚI BẮT ĐẦU LẮNG NGHE
        const server = app.listen(AUTH_PORT, () => {
            console.log("-------------------------------------------------");
            console.log(`✅ Auth Service running at http://localhost:${AUTH_PORT}`);
            console.log("-------------------------------------------------");
        });

        // 💡 5. THÊM BỘ LẮNG NGHE LỖI KHỞI ĐỘNG SERVER
        // Bắt các lỗi như Cổng đã được sử dụng (EADDRINUSE)
        server.on('error', (error) => {
            if (error.code === 'EADDRINUSE') {
                console.error("-------------------------------------------------");
                console.error(`❌ LỖI: Cổng ${AUTH_PORT} đã có chương trình khác sử dụng.`);
                console.error("❌ Vui lòng tắt chương trình đó hoặc đổi cổng trong file .env");
                console.error("-------------------------------------------------");
            } else {
                console.error("❌ Lỗi khi khởi động server:", error);
            }
            process.exit(1); // Thoát khi không thể khởi động server
        });

    } catch (dbError) {
        // Bắt lỗi từ connectAndLog (nếu nó ném lỗi thay vì process.exit)
        console.error("❌ Không thể khởi động server do lỗi database.", dbError);
        process.exit(1);
    }
}

// 6. GỌI HÀM KHỞI ĐỘNG
startServer();