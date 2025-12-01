import { Router } from "express";
import authRoutes from "./auth.route.js";
import userRoutes from "./user.route.js";
import centerRoutes from "./center.route.js";
import bookingRoutes from "./booking.route.js";
const router = Router();

// Logging middleware
router.use((req, res, next) => {
  console.log(`[Gateway] ${req.method} ${req.originalUrl}`);
  next();
});

// Gom tất cả routes
router.use( authRoutes);
router.use( userRoutes);
router.use(centerRoutes);
router.use(bookingRoutes); // <--- Sử dụng route mới


// Health check
router.get("/", (req, res) => {
  res.json({ service: "API Gateway", status: "running", uptime: process.uptime() });
});

export default router;
