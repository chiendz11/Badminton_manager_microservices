import { newsService } from "../services/news.service.js";

export const newsController = {
  async getAll(req, res) {
    try {
      const news = await newsService.getAllNews();
      res.json({ success: true, news });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Error fetching news", error: err });
    }
  },

  async create(req, res) {
    try {
      const { title, summary, image, url, category, source } = req.body;
      const news = await newsService.createNews({ title, summary, image, url, category, source });
      res.json({ success: true, news });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Error creating news", error: err });
    }
  },

  async delete(req, res) {
    try {
      const { newsId } = req.params;
      const deleted = await newsService.deleteNews(newsId);
      if (!deleted) return res.status(404).json({ success: false, message: "News not found" });
      res.json({ success: true, message: "News deleted successfully" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Error deleting news", error: err });
    }
  },
};
