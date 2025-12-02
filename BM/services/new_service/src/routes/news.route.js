import express from "express";
import { newsController } from "../controllers/news.controller.js";

const router = express.Router();

// Lấy tất cả tin tức
router.get("/", newsController.getAll);

// Tạo tin tức mới (Admin)
router.post("/", newsController.create);

// Xóa tin tức (Admin)
router.delete("/:newsId", newsController.delete);

export default router;
