import express from "express";
import { connectDB } from "./src/configs/db.config.js";
import inventoryRoutes from "./src/routes/inventory.route.js";


const app = express();
app.use(express.json());
connectDB();
app.use("/api", inventoryRoutes);

app.get("/", (req, res) => res.send("Inventory Service Running"));
