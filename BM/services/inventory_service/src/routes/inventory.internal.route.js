import express from "express";
import { InventoryController } from "../controllers/inventory.controller.js";
import internalAuth  from "../middlewares/internalAuth.middleware.js";

const router = express.Router();

router.get("/center/:centerId", internalAuth, InventoryController.getInventoriesByCenter);

export default router;
