// services/user_service/server.js
import express from "express";
import userRouter from "./routes/authRoutes.js";
// Cập nhật import từ file config mới
import { PORT } from "./config/env.config.js"; 
import helmet from "helmet";

const app = express();
const USER_PORT = PORT; 

// Global middleware
app.use(helmet());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api", userRouter);

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
app.listen(USER_PORT, () => {
    console.log("-------------------------------------------------");
    console.log(`✅ User Service running at http://localhost:${USER_PORT}`);
    console.log("-------------------------------------------------");
});

