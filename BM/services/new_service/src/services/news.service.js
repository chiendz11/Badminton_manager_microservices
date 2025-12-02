import News from "../models/news.model.js";

export const newsService = {
  async getAllNews() {
    const news = await News.find().sort({ date: -1 });
    return news.map((n) => ({
      _id: n._id,
      title: n.title,
      summary: n.summary,
      image: n.image,
      url: n.url,
      category: n.category,
      source: n.source,
      date: n.date, // trả về ISO cho frontend
    }));
  },

  async createNews({ title, summary, image, url, category, source }) {
    const news = await News.create({
      title,
      summary,
      image,
      url,
      category,
      source,
    });
    return news;
  },

  async deleteNews(id) {
    const result = await News.deleteOne({ _id: id });
    return result.deletedCount > 0;
  },
};
