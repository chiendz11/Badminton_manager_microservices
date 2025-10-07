import { Router } from "express";
import proxy from "express-http-proxy";
import { AUTH_SERVICE_URL } from "../config/index.js";

const router = Router();

// Auth Service: không cần authenticate
router.use(
  "/auth",
  proxy(AUTH_SERVICE_URL, {
    proxyReqPathResolver: (req) => req.originalUrl.replace("/auth", ""),
  })
);

export default router;