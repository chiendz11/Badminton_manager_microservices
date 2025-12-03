import mongoose from "mongoose";

const { Schema, model } = mongoose;

const InventorySchema = new Schema({
  name: { type: String, required: true }
});

export default model("inventoriesTrans", InventorySchema);
