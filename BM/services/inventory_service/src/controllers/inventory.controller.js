import { InventoryService } from "../services/inventory.service.js";
import Inventory from "../models/inventory.model.js";

export const InventoryController = {
  createInventory: async (req, res) => {
    try {
      const inventory = await InventoryService.create(req.body);
      res.status(201).json(inventory);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  getInventories: async (req, res) => {
    try {
      const inventories = await InventoryService.getAll(req.query);
      res.json(inventories);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  getInventoryById: async (req, res) => {
    try {
      const inventory = await InventoryService.getById(req.params.id);
      res.json(inventory);
    } catch (error) {
      res.status(404).json({ error: "Inventory not found" });
    }
  },

  updateInventory: async (req, res) => {
    try {
      const updated = await InventoryService.update(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  deleteInventory: async (req, res) => {
    try {
      await InventoryService.delete(req.params.id);
      res.json({ message: "Deleted" });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  getInventoriesByCenter: async (req, res) => {
    try {
      const { centerId } = req.params;

      if (!centerId) {
        return res.status(400).json({
          success: false,
          message: "centerId is required",
        });
      }

      const data = await InventoryService.getByCenter(centerId);

      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  updateStockInternal: async (req, res) => {
    console.log("internal")
    try {
      const { inventoryId, quantityChange } = req.body;
      const result = await InventoryService.updateStock(inventoryId, quantityChange);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  createInventoryInternal: async (req, res) => {
    console.log("internal")
    try {
      // Logic: Tạo sản phẩm mới trực tiếp vào DB của Inventory
      const newItem = await Inventory.create(req.body);
      res.status(201).json(newItem);
    } catch (error) {
      console.error("Lỗi createInventoryInternal:", error);
      res.status(400).json({ error: error.message });
    }
  }
};
