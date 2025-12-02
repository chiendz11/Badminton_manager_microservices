import StockHistory from "../models/stockhistory.model.js";
import SellHistory from "../models/sellhistory.model.js";

export const TransactionService = {
  createStockHistory: async (data) => StockHistory.create(data),
  getStockHistory: async (filter = {}) => StockHistory.find(filter),

  createSellHistory: async (data) => SellHistory.create(data),
  getSellHistory: async (filter = {}) => SellHistory.find(filter),
};
