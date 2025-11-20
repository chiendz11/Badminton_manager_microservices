// services/auth_service/src/routes/oauth.routes.js

import { Router } from "express";
import { OAuthController } from "../controllers/oauth.controller.js";

const oauthRouter = Router();

// GET /google/login: Bắt đầu luồng OAuth, redirect sang Google
oauthRouter.get('/google/login', OAuthController.googleLogin);

// GET /google/callback: Xử lý callback từ Google sau khi user đồng ý
oauthRouter.get('/google/callback', OAuthController.googleCallback);

export default oauthRouter;