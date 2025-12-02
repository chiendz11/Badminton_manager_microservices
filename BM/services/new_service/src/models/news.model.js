import mongoose from "mongoose";

// Helper: parse string dd/MM/yyyy sang Date UTC
const parseDate = (dateStr) => {
  if (!dateStr) return undefined;
  const [day, month, year] = dateStr.split("/").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
};

const newsSchema = new mongoose.Schema({
  title: { type: String, required: true },
  summary: { type: String, required: true },
  image: { type: String, default: "" },
  url: { type: String, required: true },
  category: { type: String, default: "general" },
  source: { type: String, default: "Unknown" },
  date: { type: String, default: () => {
    const d = new Date();
    return `${String(d.getUTCDate()).padStart(2,'0')}/${String(d.getUTCMonth()+1).padStart(2,'0')}/${d.getUTCFullYear()}`;
  } }
});

export default mongoose.model("News", newsSchema);
