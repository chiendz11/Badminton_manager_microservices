import express from "express";
import { connectDB } from "./src/configs/db.config.js";
import { env } from "./src/configs/env.config.js";
import newsRoute from "./src/routes/news.route.js";

const app = express();
app.use(express.json());

connectDB();

app.use("/api", newsRoute);

app.listen(env.port, () => {
  console.log(`News Service running on port ${env.port}`);
});
