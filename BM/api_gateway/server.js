import express from "express";
import { PORT, FRONTEND_ORIGIN, ADMIN_ORIGIN } from "./src/configs/env.config.js";
import apiRouter from "./src/routes/index.route.js"; 
import helmet from "helmet";
import cors from "cors";

// Import hàm setup GraphQL
import { startApolloServer } from './src/graphql.setup.js';

const app = express();

// --- MIDDLEWARE ---

// 💡 CẤU HÌNH CORS CHUẨN
// Lưu ý: Đảm bảo file .env của bạn có chứa port 5174 
// Ví dụ: FRONTEND_ORIGIN=http://localhost:5174 hoặc ADMIN_ORIGIN=http://localhost:5174
const allowedOrigins = [
    FRONTEND_ORIGIN, 
    ADMIN_ORIGIN
].filter(Boolean); 

app.use(cors({
    origin: (origin, callback) => {
        // Cho phép request không có origin (như mobile app, curl, postman)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.warn(`[CORS] Blocked request from origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true, 
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    // 🟢 SỬA LỖI TẠI ĐÂY: Thêm 'x-client-id' vào danh sách cho phép
    allowedHeaders: [
        'Content-Type', 
        'Authorization', 
        'X-User-ID', 
        'X-User-Role', 
        'x-client-id' // 👈 BẮT BUỘC PHẢI CÓ
    ],
}));

app.use(helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://embeddable-sandbox.cdn.apollographql.com"],
            imgSrc: ["'self'", "data:", "https://embeddable-sandbox.cdn.apollographql.com"],
            frameSrc: ["'self'", "https://sandbox.embed.apollographql.com"],
            connectSrc: ["'self'", ...allowedOrigins, "https://studio.apollographql.com"], 
        },
    },
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// --- ROUTES ---
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', mode: 'Federation' });
});

app.use("/api", apiRouter);

// 💡 HÀM WAIT & START GATEWAY
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const startGatewayWithRetry = async (retries = 5, delay = 3000) => {
    for (let i = 0; i < retries; i++) {
        try {
            console.log(`⏳ Starting Apollo Gateway (Attempt ${i + 1}/${retries})...`);
            console.log(`Origins allowed:`, allowedOrigins); 
            
            const httpServer = await startApolloServer(app);

            httpServer.listen(PORT, () => {
                console.log("-------------------------------------------------");
                console.log(`✅ API Gateway running at http://localhost:${PORT}`);
                console.log(`🚀 GraphQL Endpoint: http://localhost:${PORT}/graphql`);
                console.log("-------------------------------------------------");
            });
            return; 

        } catch (error) {
            console.error(`❌ Attempt ${i + 1} failed: ${error.message}`);
            
            if (i < retries - 1) {
                console.log(`zzZ Waiting ${delay / 1000}s for Subgraphs to wake up...`);
                await wait(delay); 
            } else {
                console.error("🚨 Max retries reached. Gateway failed to start.");
                process.exit(1);
            }
        }
    }
};

startGatewayWithRetry();