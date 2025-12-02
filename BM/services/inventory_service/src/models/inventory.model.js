import mongoose from "mongoose";

const inventorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  category: { type: String, required: true },
  centerId: { type: mongoose.Schema.Types.ObjectId, ref: "Center", required: true },
  supplier: { type: String, required: true },
  unitImport: { type: String, required: true },
  unitImportQuantity: { type: Number, required: true },
  unitSell: { type: String, required: true },
  quantity: { type: Number, default: 0 },
  barcode: { type: String, unique: true },
  image: { type: String },
  importPrice: { type: Number, required: true },
  price: { type: Number, required: true },
  bulkPrice: { type: Number, required: true },
});

inventorySchema.index({ centerId: 1, category: 1, name: 1 });
inventorySchema.index({ price: 1 });
inventorySchema.index({ name: 1 });

export default mongoose.model("Inventory", inventorySchema);
