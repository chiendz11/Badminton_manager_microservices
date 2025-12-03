import Inventory from "../models/inventory.model.js";
import mongoose from "mongoose";

export const InventoryService = {
  create: async (data) => {
    let centerObjectId = new mongoose.Types.ObjectId(data.centerId);

    const newInventoryData = {
      name: data.name,
      category: data.category,
      supplier: data.supplier,
      unitImport: data.unitImport,
      unitImportQuantity: data.unitImportQuantity,
      unitSell: data.unitSell,
      price: data.price,
      bulkPrice: data.bulkPrice,
      barcode: data.barcode,
      description: data.description,
      image: data.image,
      centerId: centerObjectId,
      quantity: data.quantity,
      importPrice: data.price,
    };

    try {
      return await Inventory.create(newInventoryData);
    } catch (error) {
      console.error("Mongoose create error:", error); // log chi tiết
      throw error; // throw thẳng để TransactionService nhận lỗi gốc
    }
  },

  updateQuantity: async (inventoryId, quantityToAdd) => {
    return await Inventory.findByIdAndUpdate(
      inventoryId,
      { $inc: { quantity: quantityToAdd } }, // Tăng số lượng tồn kho
      { new: true }
    );
  },

  getAll: async (filter = {}) => {
    return await Inventory.find(filter);
  },
  getById: async (id) => {
    return await Inventory.findById(id);
  },
  update: async (id, data) => {
    return await Inventory.findByIdAndUpdate(id, data, { new: true });
  },
  delete: async (id) => {
    return await Inventory.findByIdAndDelete(id);
  },

  getByCenter: async (centerId) => {
    return await Inventory.find({ centerId });
  },

};
