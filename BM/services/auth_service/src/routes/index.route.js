import { Router } from "express";
import authRouter from "./auth.route.js";
import oauthRouter from "./oauth.route.js";

const mainRouter = Router();

// Gắn các route xác thực email/password
mainRouter.use(authRouter); 

// Gắn các route xác thực OAuth (Google, Facebook...)
mainRouter.use(oauthRouter);

export default mainRouter;