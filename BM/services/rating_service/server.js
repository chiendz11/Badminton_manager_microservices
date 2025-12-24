import express from "express";

import { connectDB } from "./src/configs/db.config.js";
import { env } from "./src/configs/env.config.js";

import ratingRoute from "./src/routes/rating.route.js";
import ratingInternalRoute from "./src/routes/rating.internal.route.js";

const app = express();
app.use(express.json());

connectDB();

app.use("/api/", ratingRoute);
app.use("/api/internal/", ratingInternalRoute);

app.listen(env.port, () =>
  console.log(`Rating Service running on port ${env.port}`)
);
