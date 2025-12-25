import express from "express";
import { InventoryController } from "../controllers/inventory.controller.js";
import internalAuth  from "../middlewares/internalAuth.middleware.js";

const router = express.Router();

router.get("/center/:centerId", internalAuth, InventoryController.getInventoriesByCenter);
// Route nội bộ để service khác gọi update số lượng
router.put("/update-stock", internalAuth, InventoryController.updateStockInternal);
router.post("/create-inventory", internalAuth, InventoryController.createInventoryInternal)
router.put("/sell-stock", internalAuth, InventoryController.createSellStock)
export default router;
