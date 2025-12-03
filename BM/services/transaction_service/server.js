import express from "express";
import { connectDB } from "./src/configs/db.config.js";
import transactionRoute from "./src/routes/transaction.route.js";
import { PORT } from "./src/configs/env.config.js"; 

const TRANSACTION_PORT = PORT;

const app = express();
app.use(express.json());
connectDB();
app.use("/api", transactionRoute);

app.get("/", (req, res) => res.send("Transaction Service Running"));
app.listen(TRANSACTION_PORT, () => {
    console.log("-------------------------------------------------");
    console.log(`✅ User Service running at http://localhost:${TRANSACTION_PORT}`);
    console.log("-------------------------------------------------");
});