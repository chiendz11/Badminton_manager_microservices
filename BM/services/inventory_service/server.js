import express from "express";
import { connectDB } from "./src/configs/db.config.js";
import inventoryRoutes from "./src/routes/inventory.route.js";


const app = express();
app.use(express.json());
connectDB();
app.use("/api", inventoryRoutes);

// Kiểm tra xem Vault có inject biến vào không
console.log("Check Mongo URI:", process.env.MONGODB_URI ? "Has Value" : "MISSING");
console.log("Check Internal Secret:", process.env.INTERNAL_AUTH_SECRET ? "Has Value" : "MISSING");

app.get("/", (req, res) => res.send("Inventory Service Running"));
