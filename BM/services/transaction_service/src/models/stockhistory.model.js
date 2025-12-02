import mongoose from "mongoose";

const stockHistorySchema = new mongoose.Schema({
  inventoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Inventory", required: true }, // Sản phẩm nhập kho
  centerId: { type: mongoose.Schema.Types.ObjectId, ref: "Center", required: true }, // Trung tâm nhập hàng
  supplier: { type: String, required: true }, // Nhà cung cấp

  quantityImport: { type: Number, required: true }, // Số lượng nhập (theo đơn vị nhập kho)
  unitImport: { type: String, required: true }, // Đơn vị nhập (Thùng, Kiện...)
  unitImportQuantity: { type: Number, required: true }, // 1 đơn vị nhập = ? đơn vị bán lẻ
  totalAdded: { type: Number, required: true }, // Tổng số lượng được cộng vào kho (quantityImport * unitImportQuantity)

  importPrice: { type: Number, required: true }, // Giá nhập 1 đơn vị nhập (Thùng, Kiện...)
  totalCost: { type: Number, required: true }, // Tổng chi phí nhập = importPrice * quantityImport

  createdAt: { type: Date, default: Date.now }
});
stockHistorySchema.index({ inventoryId: 1, centerId: 1, createdAt: -1 }); // Để tìm lịch sử nhập kho của một sản phẩm tại một trung tâm và sắp xếp theo thời gian
stockHistorySchema.index({ centerId: 1, createdAt: -1 }); // Để tìm lịch sử nhập kho theo trung tâm và sắp xếp theo thời gian
stockHistorySchema.index({ supplier: 1, createdAt: -1 }); // Để tìm lịch sử nhập kho theo nhà cung cấp và sắp xếp theo thời gian
const StockHistory = mongoose.model("stockhistories", stockHistorySchema);
export default StockHistory;