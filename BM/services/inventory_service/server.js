import express from "express";
import { connectDB } from "./src/configs/db.config.js";
import inventoryRoutes from "./src/routes/inventory.route.js";
import inventoryInternalRoute from "./src/routes/inventory.internal.route.js";
import { PORT } from "./src/configs/env.config.js"; 

const INVENTORY_PORT = PORT;

const app = express();
app.use(express.json());
connectDB();
app.use("/api/inventories", inventoryRoutes);
app.use("/api/internal/inventories", inventoryInternalRoute); // Route nội bộ

app.get("/", (req, res) => res.send("Inventory Service Running"));
app.listen(INVENTORY_PORT, () => {
    console.log("-------------------------------------------------");
    console.log(`✅ User Service running at http://localhost:${INVENTORY_PORT}`);
    console.log("-------------------------------------------------");
});