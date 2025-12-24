import express from "express";
import * as TransactionController from "../controllers/transaction.controller.js";
import internalAuth  from "../middlewares/internalAuth.middleware.js";

const router = express.Router();

router.get("/center/:centerId", internalAuth, TransactionController.getInventoriesByCenter);

export default router;
