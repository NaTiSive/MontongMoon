import express from "express";
import cors from "cors";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";

import authRoutes from "./routes/auth.routes.js";
import fruitRoutes from "./routes/fruits.routes.js";
import contractRoutes from "./routes/contracts.routes.js";
import exportRoutes from "./routes/export.routes.js";
import transactionRoutes from "./routes/transactions.routes.js";
import activityRoutes from "./routes/activities.routes.js";
import problemRoutes from "./routes/problems.routes.js";
import treeRoutes from "./routes/trees.routes.js";
import processingRoutes from "./routes/processing.routes.js";
import uploadRoutes from "./routes/upload.routes.js"; // ✅ เพิ่ม

const app = express();

const corsConfig = {
  origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
  credentials: true, // ต้องมีบรรทัดนี้ถึงจะให้ include credentials ได้
};
app.use(cors(corsConfig));
app.options("*", cors(corsConfig)); // ให้ preflight (OPTIONS) ตอบ header ตรง
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(morgan("dev"));

// ✅ เพิ่ม static สำหรับเสิร์ฟไฟล์ที่อัปโหลด
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(
  "/static",
  express.static(path.join(__dirname, "..", "uploads"), {
    fallthrough: true,
    index: false,
    maxAge: "7d",
  })
);

// ✅ route health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ✅ route APIs เดิมทั้งหมด
app.use("/api/auth", authRoutes);
app.use("/api/fruits", fruitRoutes);
app.use("/api/contracts", contractRoutes);
app.use("/api/export", exportRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/activities", activityRoutes);
app.use("/api/problems", problemRoutes);
app.use("/api/trees", treeRoutes);
app.use("/api/processing", processingRoutes);
app.use("/api/upload", uploadRoutes); // ✅ เพิ่มให้รองรับอัปโหลด

// ✅ 404 handler
app.use((req, res) => {
  res.status(404).json({ message: "Not Found" });
});

// ✅ error handler
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
