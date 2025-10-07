// services/auth_service/src/index.js

import express from "express";
import cors from "cors";
import authRouter from "./routes/authRoutes.js";
// Cập nhật import từ file config mới
import { PORT } from "./config/env.config.js"; 
import helmet from "helmet";

const app = express();
const AUTH_PORT = PORT; 

// Global middleware
app.use(helmet());
app.use(cors(
    { 
        origin: "http://localhost:5173",       // Sử dụng địa chỉ cụ thể của Frontend
        credentials: true,             // Quan trọng: Phải bật để chấp nhận cookie
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
        allowedHeaders: ['Content-Type', 'Authorization'], // Các headers được phép
    }
));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api", authRouter);

// Health check
app.get("/", (req, res) => {
    res.json({ service: "Auth Service", status: "running" });
});

// Error handler 
app.use((err, req, res, next) => {
    console.error("[Auth Service Error]", err.stack);
    res.status(500).json({ message: "Internal Auth Service Error" });
});

// Start server
app.listen(AUTH_PORT, () => {
    console.log("-------------------------------------------------");
    console.log(`✅ Auth Service running at http://localhost:${AUTH_PORT}`);
    console.log("-------------------------------------------------");
});