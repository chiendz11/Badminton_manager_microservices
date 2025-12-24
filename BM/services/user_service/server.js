// services/user_service/server.js
import express from "express";
import userRouter from "./src/routes/user.route.js";
import userExtraRouter from "./src/routes/user-extra.route.js";
// Cập nhật import từ file config mới
import { PORT } from "./src/configs/env.config.js"; 
import helmet from "helmet";
import {connectDB, syncModelIndexes} from "./src/configs/db.config.js";
import userInternalRouter from "./src/routes/user.internal.route.js";
import { initRabbitMQ } from "./src/clients/rabbitmq.client.js";
import { startUserServiceWorker } from './src/workers/user-service.worker.js';
import { startMeiliSearchWorker } from "./src/workers/meili-search.worker.js";
import { initSpamCleanerCron } from "./src/workers/spam-cleaner.cron.js";


const app = express();
const USER_PORT = PORT; 

// Kết nối đến cơ sở dữ liệu
connectDB();
syncModelIndexes();

// Khởi động CronJob cho Spam Cleaner
initSpamCleanerCron();

// Global middleware
app.use(helmet());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
await initRabbitMQ(); // Khởi tạo kết nối RabbitMQ
startMeiliSearchWorker(); // Khởi động MeiliSearch Worker
startUserServiceWorker(); // Khởi động User Service Worker

// Routes
app.use("/api", userExtraRouter);
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

