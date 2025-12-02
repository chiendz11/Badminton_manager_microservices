import Rating from "../models/rating.model.js";
import mongoose from "mongoose";

export const ratingService = {
  async createRating({ centerId, userId, userName, stars, comment }) {
    const rating = await Rating.create({
      centerId,
      userId,
      userName,
      stars,
      comment,
    });

    return {
      id: rating._id,
      user: rating.userName,
      stars: rating.stars,
      comment: rating.comment,
      date: rating.date,
    };
  },

  async getRatingsByCenter(centerId) {
    const ratings = await Rating.find({ centerId }).sort({ _id: -1 });

    return ratings.map((r) => ({
      id: r._id,
      user: r.userName,
      stars: r.stars,
      comment: r.comment,
      date: r.date,
    }));
  },

  async deleteRating(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) return false; // check id hợp lệ
  const objectId = new mongoose.Types.ObjectId(id);
  const result = await Rating.deleteOne({ _id: objectId });
  return result.deletedCount > 0;
},
};
