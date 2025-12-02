import express from "express";
import { connectDB } from "./src/configs/db.config.js";
import transactionRoute from "./src/routes/transaction.route.js";


const app = express();
app.use(express.json());
connectDB();
app.use("/api", transactionRoute);

app.get("/", (req, res) => res.send("Transaction Service Running"));
