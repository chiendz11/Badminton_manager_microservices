import { TransactionService } from "../services/transaction.service.js";

export const TransactionController = {
  addStockHistory: async (req, res) => {
    console.log("vào controllelr add stock")
    try {
      const result = await TransactionService.createStockHistory(req.body);
      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  getStockHistory: async (req, res) => {
    console.log("vào controller get stock history")
    try {
      const result = await TransactionService.getStockHistory(req.query);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  addSellHistory: async (req, res) => {
    console.log("vào controllelr add sell history")
    try {
      const result = await TransactionService.createSellHistory(req.body);
      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  getSellHistory: async (req, res) => {
    console.log("🎯 Query nhận được:");
    try {
      // Truyền thẳng req.query vào service
      const histories = await TransactionService.getSellHistories(req.query);
      
      return res.status(200).json({
        success: true,
        data: histories || []
      });
    } catch (error) {
      console.error("🔥 Lỗi:", error.message);
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  importNewStock: async (req, res) => {
    console.log("import new stock")
    try {
      // req.body bao gồm 2 phần: productInfo (thông tin hàng) và stockInfo (thông tin nhập)
      const result = await TransactionService.createNewStockImport(req.body);
      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
};
