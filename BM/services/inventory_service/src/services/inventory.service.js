import Inventory from "../models/inventory.model.js";

export const InventoryService = {
  create: async (data) => {
    return await Inventory.create(data);
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

  updateStock: async (id, quantityChange) => {
    return await Inventory.findByIdAndUpdate(
      id,
      { $inc: { quantity: quantityChange } }, // Cộng dồn số lượng
      { new: true }
    );
  }
};
