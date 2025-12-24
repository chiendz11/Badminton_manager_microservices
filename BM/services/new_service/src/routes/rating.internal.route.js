import express from "express";
import { ratingController } from "../controllers/news.controller.js";
import internalAuth from "../middlewares/internalAuth.middleware.js";

const router = express.Router();

router.get("/:centerId", internalAuth, ratingController.getList);

export default router;
