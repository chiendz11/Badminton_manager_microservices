import { Router } from "express";
import proxy from "express-http-proxy";
import { CENTER_SERVICE_URL, INTERNAL_AUTH_SECRET } from "../configs/env.config.js";
import { authenticate } from "../middleware/authenticate.middleware.js";
import { authorize } from "../middleware/authorize.middleware.js";
import { GATEWAY_ROLES } from "../configs/role_mapping.config.js";

const router = Router();

const centerProxy = proxy(CENTER_SERVICE_URL, {
    parseReqBody: false, 
    proxyReqPathResolver: (req) => {
        const targetPath = req.originalUrl; 
        
        console.log(`[Gateway] Proxying FULL path to Center: ${targetPath}`);

        return targetPath; // Trả về /api/v1/centers/CENTER-ID/files
    },

    // Gửi kèm header nội bộ
    proxyReqOptDecorator: (proxyReqOpts, req) => {
        proxyReqOpts.headers["x-service-secret"] = INTERNAL_AUTH_SECRET;
        proxyReqOpts.headers["x-service-name"] = "graphql-gateway";

        if (req.user) {
            proxyReqOpts.headers["X-User-ID"] = req.user.id;
            proxyReqOpts.headers["X-User-Role"] = req.user.role;
            console.log(`[Gateway] Forwarding to CenterService with User ID: ${req.user.id}, Role: ${req.user.role}`);
        }

        return proxyReqOpts;
    },

    limit: "10mb",
});

// --- ROUTES ---

// ✅ CHÍNH XÁC: Định tuyến bảo mật cho việc Upload File
router.post(
    "/v1/centers/:centerId/files", 
    authenticate,
    authorize([GATEWAY_ROLES.SUPER_ADMIN, GATEWAY_ROLES.CENTER_MANAGER]),
    centerProxy
);

export default router;
