import express from "express";
import { connectDB } from "./src/configs/db.config.js";
import transactionRoute from "./src/routes/transaction.route.js";


const app = express();
app.use(express.json());
connectDB();
app.use("/api", transactionRoute);

app.get("/", (req, res) => res.send("Transaction Service Running"));

const PORT = process.env.PORT || 8087;
app.listen(PORT, () => {
  console.log(`Transaction Service is running on port ${PORT}`);
});