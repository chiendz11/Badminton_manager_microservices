import express from "express";
import { TransactionController } from "../controllers/transaction.controller.js";

const router = express.Router();

router.post("/stock", TransactionController.addStockHistory);
router.get("/stock", TransactionController.getStockHistory);

router.post("/sell", TransactionController.addSellHistory);
router.get("/sell", TransactionController.getSellHistory);

export default router;
