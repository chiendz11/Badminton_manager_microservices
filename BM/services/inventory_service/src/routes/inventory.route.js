import express from "express";
import { InventoryController } from "../controllers/inventory.controller.js";

const router = express.Router();

router.post("/", InventoryController.createInventory);
router.get("/", InventoryController.getInventories);
router.get("/:id", InventoryController.getInventoryById);
router.put("/:id", InventoryController.updateInventory);
router.delete("/:id", InventoryController.deleteInventory);
router.get("/center/:centerId", InventoryController.getInventoriesByCenter);

export default router;
