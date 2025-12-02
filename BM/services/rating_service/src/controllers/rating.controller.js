import { ratingService } from "../services/rating.service.js";

export const ratingController = {
  async create(req, res) {
    try {
      const { centerId, stars, comment } = req.body;
      const userId = req.headers["x-user-id"];
      const userName = req.headers["x-user-name"] || "Ẩn danh";

      if (!userId)
        return res.status(401).json({ message: "Missing user credentials" });

      const rating = await ratingService.createRating({
        centerId,
        userId,
        userName,
        stars,
        comment,
      });

      res.json({ rating });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error creating rating", error });
    }
  },

  async getList(req, res) {
    try {
      const { centerId } = req.params;
      const reviews = await ratingService.getRatingsByCenter(centerId);
      res.json({ reviews });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error fetching rating list", error });
    }
  },

   async delete(req, res) {
    try {
      const { ratingId } = req.params; // lấy id rating từ URL
      if (!ratingId) return res.status(400).json({ message: "Missing rating id" });

      const deleted = await ratingService.deleteRating(ratingId);
      if (!deleted) return res.status(404).json({ message: "Rating not found" });

      res.json({ message: "Rating deleted successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error deleting rating", error });
    }
  }


};
