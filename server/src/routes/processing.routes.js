// server/src/routes/processing.routes.js
import { Router } from "express";
import { z } from "zod";
import prisma from "../config/prisma.js";

const router = Router();

// ค่าประเภทการแปรรูป (ภาษาไทยตรง DB)
const PROCESS_TYPES = ["ทอด", "แช่แข็ง", "กวน", "อบแห้ง", "อื่นๆ"];

/* ─────────────────────────────────────────────
 * 1) สต็อกทุเรียนตกเกรดคงเหลือ (เฉพาะ type='เก็บเกี่ยว')
 * remaining = SUM(ตกเกรด & เก็บเกี่ยว) - SUM(ถูกแปรรูป)
 * ──────────────────────────────────────────── */
// 1) สต็อกทุเรียนตกเกรดคงเหลือ (ยืดหยุ่นข้อความ + debug breakdown)
router.get("/stock", async (_req, res) => {
  const ownerId = 1; // mock

  try {
    // ดึง breakdown ของทุเรียนตกเกรดตาม type ทั้งหมดของ owner นี้
    const byTypeRows = await prisma.$queryRawUnsafe(
      `SELECT TRIM(type) AS t, COALESCE(SUM(amount),0) AS sum_amount, COUNT(*) AS cnt
         FROM durian_fruit
        WHERE owner_id = ?
          AND grade = 'ตกเกรด'
        GROUP BY TRIM(type)
        ORDER BY t`,
      ownerId
    );

    // เก็บเกี่ยว = ทุกแถวที่ type (หลัง TRIM) ขึ้นต้นด้วย "เก็บเกี่ยว"
    const harvestedSum = byTypeRows
      .filter(r => String(r.t || "").startsWith("เก็บเกี่ยว"))
      .reduce((acc, r) => acc + Number(r.sum_amount || 0), 0);

    // แปรรูป = type อยู่ในชุดนี้ (หลัง TRIM)
    const PROCESS_TYPES = ["ทอด", "แช่แข็ง", "กวน", "อบแห้ง", "อื่นๆ"];
    const processedSum = byTypeRows
      .filter(r => PROCESS_TYPES.includes(String(r.t || "")))
      .reduce((acc, r) => acc + Number(r.sum_amount || 0), 0);

    const remaining = Math.max(0, harvestedSum - processedSum);

    // ส่ง debug กลับไปด้วย เพื่อดูใน Network → Preview
    return res.json({
      remaining,
      _debug: {
        harvestedSum,
        processedSum,
        byType: byTypeRows.map(r => ({
          type: r.t,
          sum: Number(r.sum_amount || 0),
          rows: Number(r.cnt || 0),
        })),
      },
    });
  } catch (err) {
    console.error("❌ /processing/stock error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});


/* ─────────────────────────────────────────────
 * 2) บันทึกการแปรรูป (Raw SQL ตามคอลัมน์จริงใน DB)
 * ──────────────────────────────────────────── */
const createSchema = z.object({
  method: z.string(),            // "ทอด" | "แช่แข็ง" | "กวน" | "อบแห้ง" | "อื่นๆ"
  amountKg: z.number().positive(),
  note: z.string().optional(),
});

router.post("/", async (req, res) => {
  const parsed = createSchema.safeParse({
    method: req.body?.method,
    amountKg: Number(req.body?.amountKg),
    note: req.body?.note,
  });

  if (!parsed.success) {
    return res
      .status(400)
      .json({ message: "ข้อมูลไม่ถูกต้อง", details: parsed.error.flatten() });
  }

  const ownerId = 1; // mock owner ชั่วคราว
  if (!PROCESS_TYPES.includes(parsed.data.method)) {
    return res.status(400).json({ message: "วิธีการแปรรูปไม่ถูกต้อง" });
  }

  try {
    // ตรวจสต็อกคงเหลือ (ตามกติกา: นับเฉพาะตกเกรด & เก็บเกี่ยว แล้วลบด้วยที่แปรรูปไป)
    const [harv] = await prisma.$queryRawUnsafe(
      `SELECT COALESCE(SUM(amount),0) AS sum_amount
         FROM durian_fruit
        WHERE owner_id = ?
          AND grade = 'ตกเกรด'
          AND type  = 'เก็บเกี่ยว'`,
      ownerId
    );
    const [proc] = await prisma.$queryRawUnsafe(
      `SELECT COALESCE(SUM(amount),0) AS sum_amount
         FROM durian_fruit
        WHERE owner_id = ?
          AND type IN ('ทอด','แช่แข็ง','กวน','อบแห้ง','อื่นๆ')`,
      ownerId
    );

    const stock = Math.max(
      0,
      Number(harv?.sum_amount ?? 0) - Number(proc?.sum_amount ?? 0)
    );
    if (parsed.data.amountKg > stock) {
      return res
        .status(400)
        .json({ message: "ปริมาณเกินกว่าทุเรียนตกเกรดคงเหลือ" });
    }

    // หา fruit_id ถัดไป (F001, F002, ...)
    const [maxRow] = await prisma.$queryRawUnsafe(
      `SELECT COALESCE(MAX(CAST(SUBSTRING(fruit_id, 2) AS UNSIGNED)), 0) AS maxnum
         FROM durian_fruit
        WHERE fruit_id REGEXP '^F[0-9]+'`
    );
    const nextId = `F${String(Number(maxRow?.maxnum ?? 0) + 1).padStart(3, "0")}`;

    // INSERT แถวใหม่ลง DB (snake_case ตรงคอลัมน์จริง)
    await prisma.$executeRawUnsafe(
      `INSERT INTO durian_fruit
         (fruit_id, tree_id, owner_id, broker_id, grade, amount, type, date, note)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?)`,
      nextId,
      "PROCESS",
      ownerId,
      null,
      "ตกเกรด",
      parsed.data.amountKg,
      parsed.data.method,      // หนึ่งใน PROCESS_TYPES
      parsed.data.note ?? ""
    );

    // ส่งรายการที่เพิ่งสร้างกลับไป
    const [created] = await prisma.$queryRawUnsafe(
      `SELECT fruit_id, tree_id, owner_id, broker_id, grade, amount, type, date, note
         FROM durian_fruit
        WHERE fruit_id = ?`,
      nextId
    );

    return res.status(201).json({ data: created ?? { fruit_id: nextId } });
  } catch (err) {
    console.error("❌ POST /processing error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

/* ─────────────────────────────────────────────
 * 3) รายการแปรรูปล่าสุด (Raw SQL)
 * ──────────────────────────────────────────── */
router.get("/recent", async (_req, res) => {
  const ownerId = 1; // mock owner ชั่วคราว
  try {
    const rows = await prisma.$queryRawUnsafe(
      `SELECT fruit_id, tree_id, owner_id, broker_id, grade, amount, type, date, note
         FROM durian_fruit
        WHERE owner_id = ?
          AND type IN ('ทอด','แช่แข็ง','กวน','อบแห้ง','อื่นๆ')
        ORDER BY date DESC
        LIMIT 50`,
      ownerId
    );
    return res.json({ data: rows });
  } catch (err) {
    console.error("❌ /processing/recent error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

export default router;
