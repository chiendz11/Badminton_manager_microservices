import { Router } from "express";
import { userExtraController } from "../controllers/user-extra.controller.js";

const router = Router();

router.patch('/users-extra', userExtraController.updateUserExtra);
router.get('/users-extra', userExtraController.getUserExtra);



export default router;