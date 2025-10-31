import express from "express";
import cors from "cors";
import morgan from "morgan";
import authRoutes from "./routes/auth.routes.js";
import fruitRoutes from "./routes/fruits.routes.js";
import contractRoutes from "./routes/contracts.routes.js";
import exportRoutes from "./routes/export.routes.js";
import transactionRoutes from "./routes/transactions.routes.js";
import activityRoutes from "./routes/activities.routes.js";
import problemRoutes from "./routes/problems.routes.js";
import treeRoutes from "./routes/trees.routes.js";
import processingRoutes from "./routes/processing.routes.js";

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN?.split(",") ?? "*" }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/auth", authRoutes);
app.use("/api/fruits", fruitRoutes);
app.use("/api/contracts", contractRoutes);
app.use("/api/export", exportRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/activities", activityRoutes);
app.use("/api/problems", problemRoutes);
app.use("/api/trees", treeRoutes);
app.use("/api/processing", processingRoutes);

app.use((req, res) => {
  res.status(404).json({ message: "Not Found" });
});

app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  const status = err.status || 500;
  res.status(status).json({
    message: err.message || "Internal Server Error",
    details: err.details || undefined,
  });
});

export default app;
