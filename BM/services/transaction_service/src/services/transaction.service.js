import axios from "axios";
import Inventory from "../models/inventory.model.js";
import StockHistory from "../models/stockhistory.model.js";
import SellHistory from "../models/sellhistory.model.js";

// Khai báo URL - Đảm bảo có /api ở cuối nếu Inventory Service dùng route prefix
const getBaseUrl = () => {
  const url = process.env.TRANSACTION_INVENTORY_URL || "http://inventory_service:8089";
  // Nếu Inventory server.js có app.use("/api", ...), ta phải thêm /api vào đây
  return url.endsWith("/api") ? url : `${url}/api`;
};

const getInternalSecret = () => process.env.INVENTORY_INTERNAL_AUTH_SECRET || "bop";

export const TransactionService = {
  // Hàm helper tạo request để đảm bảo URL luôn mới nhất
  getApi: () => axios.create({
    baseURL: getBaseUrl(),
    headers: { "x-internal-secret": getInternalSecret() }
  }),

  createStockHistory: async (data) => {
    const exists = await Inventory.findById(data.inventoryId);
    if (!exists) throw new Error("Sản phẩm chưa đồng bộ sang Transaction Service");

    const historyEntry = await StockHistory.create(data);
    
    // Debug URL thực tế
    const api = TransactionService.getApi();
    console.log("🚀 Gọi API tới:", `${api.defaults.baseURL}/internal/update-stock`);
    console.log(api.headers)

    try {
      await api.put("/internal/update-stock", {
        inventoryId: data.inventoryId,
        quantityChange: data.totalAdded
      });
    } catch (error) {
      await StockHistory.findByIdAndDelete(historyEntry._id);
      const errorMsg = error.response?.data?.error || error.message;
      throw new Error(`Lỗi cập nhật kho (404/500): ${errorMsg}`);
    }
    return historyEntry;
  },

  createNewStockImport: async ({ productInfo, stockInfo }) => {
    let newInventoryId;
    let newInventoryName;
    console.log("🚀 Gọi API tới:", `${api.defaults.baseURL}/internal/create-inventory`);
    try {
      const api = TransactionService.getApi();
      const response = await api.post("/internal/create-inventory", {
        ...productInfo,
        quantity: stockInfo.totalAdded,
        centerId: stockInfo.centerId,
        supplier: stockInfo.supplier,
        unitImport: stockInfo.unitImport,
        unitImportQuantity: stockInfo.unitImportQuantity,
        importPrice: stockInfo.importPrice,
        bulkPrice: productInfo.price * 0.9
      });

      newInventoryId = response.data._id;
      newInventoryName = response.data.name;
    } catch (error) {
      console.error("Lỗi tạo hàng mới:", error.response?.data || error.message);
      throw new Error("Không thể tạo hàng mới tại Inventory Service");
    }

    await Inventory.findOneAndUpdate(
      { _id: newInventoryId },
      { name: newInventoryName },
      { upsert: true, new: true }
    );

    return await StockHistory.create({
      ...stockInfo,
      inventoryId: newInventoryId
    });
  },

  getStockHistory: async ({ centerId, year, month }) => {
    const filter = {};
    if (centerId) filter.centerId = centerId;
    if (year) {
      const startMonth = month && month !== "all" ? parseInt(month) - 1 : 0;
      const endMonth = month && month !== "all" ? parseInt(month) : 12;
      filter.createdAt = {
        $gte: new Date(year, startMonth, 1),
        $lt: new Date(year, endMonth, 1)
      };
    }
    return await StockHistory.find(filter)
      .populate("inventoryId", "name")
      .sort({ createdAt: -1 });
  }
};