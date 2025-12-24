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
    console.log("vào controllelr")
    try {
      const result = await TransactionService.getStockHistory(req.query);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  addSellHistory: async (req, res) => {
    console.log("vào controllelr")
    try {
      const result = await TransactionService.createSellHistory(req.body);
      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  getSellHistory: async (req, res) => {
    console.log("vào controllelr")
    try {
      const result = await TransactionService.getSellHistory(req.query);
      res.json({data: result});
    } catch (error) {
      res.status(500).json({ error: error.message });
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
