// src/models/inventory.model.js
import mongoose from "mongoose";

const inventorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true }
  },
  { collection: "inventoriestrans" }
);

export default mongoose.model("Inventory", inventorySchema);
