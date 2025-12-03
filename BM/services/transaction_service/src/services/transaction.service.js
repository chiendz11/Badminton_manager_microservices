// src/services/TransactionService.js (Giả định)
import StockHistory from "../models/stockhistory.model.js";
import SellHistory from "../models/sellhistory.model.js";
import Inventory from "../models/inventories.model.js";
// import axios from "axios"; // Đã được sử dụng trong createInternalApiClient
import axios from "axios";
import mongoose from "mongoose";
import { createInternalApiClient } from "../utils/internal.api.js";

import { INVENTORY_SERVICE_URL } from "../configs/env.config.js"; 


// --- HELPER: Cấu hình URL cơ sở ---
// Giả định INVENTORY_SERVICE_URL là URL của Inventory Service
const internalAPI = createInternalApiClient(INVENTORY_SERVICE_URL + "/api/internal/inventories");
// --- HELPER FUNCTION CHO INTERNAL API CALLS ---

// 1. Hàm gọi API tạo mới Inventory: POST /api/inventories
const createInventoryViaInternalAPI = async (data) => {
    // Chỉ lấy các trường cần thiết cho việc tạo mới Inventory
    const newInventoryData = {
        name: data.itemName, // Sửa thành itemName để khớp với payload từ FE
        category: data.category,
        supplier: data.supplier,
        // Các trường liên quan đến đơn vị nhập và đơn vị bán lẻ
        unitImport: data.unitImport,
        unitImportQuantity: data.unitImportQuantity,
        unitSell: data.unitSell,
        price: data.price, // Giá bán lẻ
        bulkPrice: data.bulkPrice || 0,
        importPrice: data.importPrice * data.unitImportQuantity, // Giá nhập theo đơn vị bán lẻ
        ...(data.barcode ? { barcode: data.barcode } : {}),
        description: data.description || "",
        image: data.image || "",
        centerId: data.centerId,
        // Quantity ban đầu là TỔNG số lượng bán lẻ được nhập
        quantity: data.totalAdded, 
    };
    
    try {
        const response = await internalAPI.post("/", newInventoryData);

        return response; 
    } catch (error) {
        console.error("Lỗi gọi API tạo Inventory nội bộ:", error.response?.data || error.message);
        throw new Error("Lỗi kết nối hoặc xử lý tại Inventory Service khi tạo mới.");
    }
};

// 2. Hàm gọi API cập nhật số lượng Inventory: PUT /api/inventories/:id
const updateInventoryQuantityViaInternalAPI = async (inventoryId, quantityToAdd) => {
    
    try {
        // Gọi API PUT để cập nhật số lượng tồn kho
        const response = await internalAPI.put(`/${inventoryId}`, {
            quantityToAdd: quantityToAdd,
        });
        // Giả định API trả về { data: updatedInventoryObject }
        return response.data; 
    } catch (error) {
        console.error("Lỗi gọi API cập nhật số lượng nội bộ:", error.response?.data || error.message);
        throw new Error("Lỗi kết nối hoặc xử lý tại Inventory Service khi cập nhật số lượng.");
    }
};

export const TransactionService = {
  createStockHistory: async (data) => {
    let inventoryId = data.inventoryId;
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // --- BƯỚC 1: Xử lý Inventory (Tạo mới hoặc Cập nhật số lượng qua Internal API) ---
        if (data.isNewItem) {
          // 1.1. TẠO MỚI Inventory qua Internal API
          const newInventory = await createInventoryViaInternalAPI(data); 
          console.log("New Inventory created via Internal API:", newInventory);
          if (!newInventory || !newInventory._id) {
            throw new Error("Không nhận được ID hợp lệ sau khi tạo Inventory mới.");
          }
          inventoryId = newInventory._id;
          const fixedId = new mongoose.Types.ObjectId(inventoryId);
          // Lưu ý: Số lượng tồn kho ban đầu đã được set trong createInventoryViaInternalAPI là data.totalAdded
          console.log("New Inventory:", newInventory);
          const inventoryData = {
            _id: fixedId,
            name: newInventory.name,
          }
          console.log("Inventory Data to create locally:", inventoryData);


        const inventory = await Inventory.create([inventoryData], { session });
        console.log("Inventory created locally:", inventory[0]);
          
        } else if (data.inventoryId) {
          // 1.2. Mặt hàng đã tồn tại: Cập nhật tăng số lượng tồn kho qua Internal API
          if (data.totalAdded > 0) {
            await updateInventoryQuantityViaInternalAPI( 
              data.inventoryId, 
              data.totalAdded // totalAdded đã là tổng số lượng đơn vị nhỏ lẻ
            );
          }
        } else {
            throw new Error("Thông tin nhập kho không hợp lệ (Thiếu ID hoặc cờ tạo mới).");
        }

        // --- BƯỚC 2: Ghi nhận Lịch sử nhập kho (Stock History) ---
        // Giá nhập (importPrice) và Số lượng nhập (quantityImport) trong StockHistory
        // nên được quy đổi về đơn vị nhỏ lẻ, hoặc giữ nguyên đơn vị nhập tùy theo
        // thiết kế DB. Giả định ở đây: StockHistory lưu theo đơn vị nhập (quantityImport)
        // và lưu TỔNG CHI PHÍ (totalCost) và TỔNG SỐ LƯỢNG BÁN LẺ (totalAdded).
        


        const stockHistoryData = {
          inventoryId: inventoryId,
          centerId: data.centerId,
          supplier: data.supplier,
          
          // Lưu theo đơn vị nhập (quantityImport, importPrice)
          quantityImport: data.quantityImport * data.unitImportQuantity, // Quy đổi về số lượng cho đơn vị nhỏ lẻ
          importPrice: data.importPrice * data.unitImportQuantity, // Quy đổi về giá cho đơn vị nhỏ lẻ
          
          unitImport: data.unitImport, 
          unitImportQuantity: data.unitImportQuantity,
          
          totalAdded: data.totalAdded, // Tổng số lượng đơn vị nhỏ lẻ được thêm
          totalCost: data.importPrice * data.unitImportQuantity, // Tổng chi phí cho lô hàng
        };

        const history = await StockHistory.create([stockHistoryData], { session });
        
        await session.commitTransaction();
        session.endSession();
        
        return history[0]; // Trả về đối tượng lịch sử nhập kho đã tạo
        
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error("Transaction Error:", error);
        throw error;
    }
  },

  getStockHistory: async ({ centerId, year, month } = {}) => {
    const filter = {};

    if (centerId) {
      filter.centerId = new mongoose.Types.ObjectId(centerId);
    }

    if (year) {
      let start = new Date(`${year}-01-01T00:00:00.000Z`);
      let end = new Date(`${year}-12-31T23:59:59.999Z`);

      if (month && month >= 1 && month <= 12) {
        start = new Date(`${year}-${month.toString().padStart(2, "0")}-01T00:00:00.000Z`);
        end = new Date(`${year}-${month.toString().padStart(2, "0")}-${new Date(year, month, 0).getDate()}T23:59:59.999Z`);
      }

      filter.createdAt = { $gte: start, $lte: end };
    }

    return StockHistory.find(filter)
      .populate({
        path: "inventoryId",
        model: Inventory, 
        select: "name", 
      })
      .sort({ createdAt: -1 });
  },

  createSellHistory: async (data) => SellHistory.create(data),

  getSellHistory: async (filter = {}) => {
    return SellHistory.find(filter)
      .populate({
        path: "items.inventoryId", // populate trong array items
        model: Inventory,
        select: "name", 
      })
      .sort({ createdAt: -1 });
  },
  // createSellHistory đã được định nghĩa ở trên, giữ lại nếu cần
  // createSellHistory: async (data) => SellHistory.create(data),
};