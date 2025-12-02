import { TransactionService } from "../services/transaction.service.js";

export const TransactionController = {
  addStockHistory: async (req, res) => {
    try {
      const result = await TransactionService.createStockHistory(req.body);
      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  getStockHistory: async (req, res) => {
    try {
      const result = await TransactionService.getStockHistory(req.query);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  addSellHistory: async (req, res) => {
    try {
      const result = await TransactionService.createSellHistory(req.body);
      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  getSellHistory: async (req, res) => {
    try {
      const result = await TransactionService.getSellHistory(req.query);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
};
