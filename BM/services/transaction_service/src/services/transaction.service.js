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
    const api = TransactionService.getApi();
    console.log("🚀 Gọi API tới:", `${api.defaults.baseURL}/internal/create-inventory`);
    const finalBarcode = productInfo.barcode || 
      `${productInfo.name.substring(0,3).toUpperCase()}-${Date.now()}`;
    try {
      const response = await api.post("/internal/create-inventory", {
        ...productInfo,
        barcode: finalBarcode,
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
  },

  // transaction.service.js
  getSellHistories: async (queryData) => {
  const { centerId, startDate, endDate, invoiceNumber } = queryData;
  let query = {};

  if (centerId && centerId !== "" && centerId !== "null") {
    query.centerId = centerId; 
  }

  if (invoiceNumber) {
    query.invoiceNumber = { $regex: invoiceNumber, $options: 'i' };
  }

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.createdAt.$lte = end;
    }
  }

  // 1. Lấy danh sách hóa đơn bán hàng
  const sellHistories = await SellHistory.find(query)
    .populate('items.inventoryId')
    .sort({ createdAt: -1 })
    .lean(); // Dùng lean() để có thể chỉnh sửa object trả về

  // 2. Lấy danh sách giá nhập từ StockHistory để tra cứu
  // Chúng ta sẽ lấy giá nhập gần nhất của từng sản phẩm để tính lợi nhuận
  const historiesWithProfit = await Promise.all(sellHistories.map(async (invoice) => {
    let totalInvoiceProfit = 0;

    const processedItems = await Promise.all(invoice.items.map(async (item) => {
      // Tìm bản ghi nhập kho gần nhất của sản phẩm này trước thời điểm bán
      const lastStock = await StockHistory.findOne({
        inventoryId: item.inventoryId?._id,
        createdAt: { $lte: invoice.createdAt }
      }).sort({ createdAt: -1 });

      // Tính giá nhập đơn vị (importPrice = totalCost / totalAdded)
      const importPrice = lastStock && lastStock.totalAdded > 0 
        ? lastStock.totalCost / lastStock.totalAdded 
        : 0;

      const unitProfit = (item.unitPrice || 0) - importPrice;
      const itemTotalProfit = unitProfit * (item.quantity || 0);
      
      totalInvoiceProfit += itemTotalProfit;

      return {
        ...item,
        importPrice: importPrice, // Trả về thêm để Front-end biết giá nhập
        profit: itemTotalProfit   // Lợi nhuận của từng món
      };
    }));

    return {
      ...invoice,
      items: processedItems,
      totalProfit: totalInvoiceProfit // Tổng lợi nhuận của cả hóa đơn
    };
  }));

  return historiesWithProfit;
},

  createSellHistory: async (payload) => {
    const { centerId, items, paymentMethod } = payload;
    const api = TransactionService.getApi();
    
    try {
      // 1. Trừ kho và lấy thông tin giá từ Inventory Service
      const inventoryResponse = await api.put("/internal/sell-stock", {
        centerId,
        items: items.map(item => ({
          inventoryId: item.inventoryId,
          quantity: item.quantity
        }))
      });

      const productsFromInv = inventoryResponse.data.products; 

      // 2. Tính toán chi tiết từng dòng hàng để khớp Schema
      let totalAmount = 0;
      const processedItems = items.map(item => {
        const productInfo = productsFromInv.find(p => p._id.toString() === item.inventoryId.toString());
        const unitPrice = productInfo?.price || 0;
        const totalPrice = unitPrice * item.quantity;
        totalAmount += totalPrice;

        return {
          inventoryId: item.inventoryId,
          quantity: item.quantity,
          unitPrice: unitPrice,    // Yêu cầu bởi Schema
          totalPrice: totalPrice   // Yêu cầu bởi Schema
        };
      });

      // 3. Tạo bản ghi với đầy đủ các trường bắt buộc
      return await SellHistory.create({
        centerId,
        invoiceNumber: `INV-${Date.now()}`, // Tự sinh mã hóa đơn
        items: processedItems,
        totalAmount,
        paymentMethod: paymentMethod || "Cash", // Nhận từ UI
        createdAt: new Date()
      });

    } catch (error) {
      const detailError = error.response?.data?.error || error.message;
      throw new Error(detailError);
    }
  }

};