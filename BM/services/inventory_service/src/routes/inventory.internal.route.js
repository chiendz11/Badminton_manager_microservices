import express from "express";
import * as inventoryController from "../controllers/inventory.controller.js";
import internalAuth  from "../middlewares/internalAuth.middleware.js";

const router = express.Router();

router.get("/center/:centerId", internalAuth, inventoryController.getInventoriesByCenter);

export default router;
