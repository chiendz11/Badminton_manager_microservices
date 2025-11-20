// services/user_service/server.js
import express from "express";
import userRouter from "./src/routes/user.route.js";
// Cập nhật import từ file config mới
import { PORT } from "./src/configs/env.config.js"; 
import helmet from "helmet";
import {connectDB, syncModelIndexes} from "./src/configs/db.config.js";
import userInternalRouter from "./src/routes/user.internal.route.js";

const app = express();
const USER_PORT = PORT; 

// Kết nối đến cơ sở dữ liệu
connectDB();
syncModelIndexes();

// Global middleware
app.use(helmet());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api", userRouter);
app.use("/internal", userInternalRouter);

// Health check
app.get("/", (req, res) => {
    res.json({ service: "User Service", status: "running" });
});

// Error handler 
app.use((err, req, res, next) => {
    console.error("[User Service Error]", err.stack);
    res.status(500).json({ message: "Internal User Service Error" });
});

// Start server
app.listen(USER_PORT, () => {
    console.log("-------------------------------------------------");
    console.log(`✅ User Service running at http://localhost:${USER_PORT}`);
    console.log("-------------------------------------------------");
});

