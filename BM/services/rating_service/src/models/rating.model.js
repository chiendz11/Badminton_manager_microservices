import mongoose from "mongoose";

const ratingSchema = new mongoose.Schema({
  centerId: { type: String, required: true },
  userId: { type: String, required: true },
  userName: { type: String, required: true },
  stars: { type: Number, min: 1, max: 5, required: true },
  comment: { type: String, required: true },
  date: { type: String, default: () => new Date().toISOString() },
});

export default mongoose.model("Rating", ratingSchema);
