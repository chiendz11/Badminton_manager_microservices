import express from "express";
import { ratingController } from "../controllers/rating.controller.js";

const router = express.Router();

router.get("/:centerId", ratingController.getList);
router.post("/", ratingController.create);
router.delete("/:ratingId", ratingController.delete);

export default router;
