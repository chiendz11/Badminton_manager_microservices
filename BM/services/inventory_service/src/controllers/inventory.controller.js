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
  },

  createSellStock: async (req, res) => {
    const { items } = req.body;
    try {
      const updatedProducts = [];

      // Bước 1: Kiểm tra tồn kho cho tất cả các mặt hàng trước
      for (const item of items) {
        const product = await Inventory.findById(item.inventoryId);
        
        if (!product) {
          return res.status(404).json({ error: `Sản phẩm ID ${item.inventoryId} không tồn tại` });
        }
        
        if (product.quantity < item.quantity) {
          return res.status(400).json({ 
            error: `Sản phẩm "${product.name}" không đủ tồn kho (Còn: ${product.quantity}, Cần: ${item.quantity})` 
          });
        }
        updatedProducts.push({ product, sellQty: item.quantity });
      }

      // Bước 2: Chỉ khi tất cả đủ hàng mới tiến hành trừ kho
      const resultDetails = [];
      for (const entry of updatedProducts) {
        entry.product.quantity -= entry.sellQty;
        await entry.product.save();
        
        // Trả về thông tin cần thiết để Transaction Service tạo hóa đơn
        resultDetails.push({
          _id: entry.product._id,
          price: entry.product.price,
          name: entry.product.name
        });
      }

      // Trả về thành công kèm thông tin giá tiền
      res.json({ 
        success: true, 
        products: resultDetails 
      });
      
    } catch (error) {
      console.error("Lỗi createSellStock:", error);
      res.status(500).json({ error: error.message });
    }
  }
};
