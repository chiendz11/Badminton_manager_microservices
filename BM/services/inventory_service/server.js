import express from "express";
import { connectDB } from "./src/configs/db.config.js";
import inventoryRoutes from "./src/routes/inventory.route.js";
import internalRoutes from "./src/routes/inventory.internal.route.js"


const app = express();
app.use(express.json());

// --- MIDDLEWARE KIỂM TRA API GỌI ĐẾN (LOGGER) ---
app.use((req, res, next) => {
  const now = new Date().toLocaleString();
  console.log(`[${now}] 🚀 ${req.method} ${req.url}`);
  
  // Nếu là POST/PUT thì in thêm dữ liệu gửi lên để debug
  if (['POST', 'PUT'].includes(req.method)) {
    console.log("📦 Body:", JSON.stringify(req.body, null, 2));
  }
  
  // Kiểm tra xem có gửi kèm Secret không (để debug lỗi 401/403)
  console.log("🔑 Internal-Secret Header:", req.headers['x-internal-secret'] ? "YES" : "NO");
  
  next(); // Cho phép request đi tiếp vào các Route bên dưới
});

connectDB();

app.use("/api/internal", internalRoutes);
app.use("/api", inventoryRoutes);

// Kiểm tra xem Vault có inject biến vào không
console.log("Check Mongo URI:", process.env.MONGODB_URI ? "Has Value" : "MISSING");
console.log("Check Internal Secret:", process.env.INTERNAL_AUTH_SECRET ? "Has Value" : "MISSING");

app.get("/", (req, res) => res.send("Inventory Service Running"));

// --- PHẦN THIẾU CỰC KỲ QUAN TRỌNG ---
const PORT = process.env.PORT || 8089;
app.listen(PORT, () => {
  console.log(`Inventory Service is running on port ${PORT}`);
});