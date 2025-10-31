// server/src/routes.js
import { Router } from "express";

// 🧩 Auth & Users
import authRoutes from "./modules/auth/auth.routes.js";
import usersRoutes from "./modules/users/users.routes.js";

// 📄 Contracts (ข้อเสนอ)
import contractsRoutes from "./modules/contracts/contracts.routes.js";

// 👑 Owner (ตั้ง deadline รับข้อเสนอ)
import ownerRoutes from "./modules/owner/owner.routes.js";

// 🚚 Export Requests (คำขอส่งออก)
import exportRoutes from "./modules/export/export.routes.js";

// 🌳 Fruits (ผลผลิต เก็บเกี่ยว / แปรรูป / ส่งออก)
import fruitsRoutes from "./modules/fruits/fruits.routes.js";

// 📦 Inventory (สต็อกทุเรียนที่เหลือ)
import inventoryRoutes from "./modules/inventory/inventory.routes.js";

// 🧺 Processing (การแปรรูป UC11)
import processingRoutes from "./modules/processing/processing.routes.js";

// 💰 Accounts (รายรับ / รายจ่าย)
import accountsRoutes from "./modules/accounts/accounts.routes.js";

// 🚨 Problems (ปัญหาที่นายหน้าแจ้ง)
import problemsRoutes from "./modules/problems/problems.routes.js";

// ⚙️ Activities (กิจกรรม)
import activitiesRoutes from "./modules/activities/activities.routes.js";

// 🌱 Trees (สถานะต้นทุเรียน)
import treesRoutes from "./modules/trees/trees.routes.js";

// --------------------------------------------------
const router = Router();

// ✅ ตรวจสอบว่าเซิร์ฟเวอร์ออนไลน์อยู่
router.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// ✅ รวมทุกโมดูลเข้ากับ path หลัก
router.use("/auth", authRoutes);
router.use("/users", usersRoutes);
router.use("/contracts", contractsRoutes);
router.use("/owner", ownerRoutes);
router.use("/export-requests", exportRoutes);
router.use("/fruits", fruitsRoutes);
router.use("/inventory", inventoryRoutes);
router.use("/processing", processingRoutes);
router.use("/accounts", accountsRoutes);
router.use("/problems", problemsRoutes);
router.use("/activities", activitiesRoutes);
router.use("/trees", treesRoutes);

// --------------------------------------------------
export default router;
