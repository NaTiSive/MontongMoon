import { Router } from "express";
import { z } from "zod";
import prisma from "../config/prisma.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { FruitFlowType, FruitGrade } from "@prisma/client";
import {
  mapFruit,
  FRUIT_PROCESS_METHOD_LABELS,
  FRUIT_GRADE_LABELS,
  normalizeFruitFlowCode,
} from "../utils/formatters.js";
import { computeNetStockByGrade } from "../utils/fruits.js";

const router = Router();

// กลุ่มประเภท "แปรรูป" ทั้งหมด (ตาม enum)
const PROCESS_TYPES = [
  FruitFlowType.fry,
  FruitFlowType.freeze,
  FruitFlowType.jam,
  FruitFlowType.dry,
  FruitFlowType.other,
];

const getOwnerId = (req) => {
  const rawId = req.user?.owner_id ?? req.user?.id ?? 1;
  return Number(rawId) || 1;
};

const FALLEN_LABEL = FRUIT_GRADE_LABELS[FruitGrade.fallen] || "ตกเกรด";

async function getDowngradedStockForOwner(ownerId) {
  const { by_grade } = await computeNetStockByGrade({ ownerId });
  const remaining = Number(by_grade?.[FALLEN_LABEL] ?? 0);
  return Math.max(0, remaining);
}

// คิด "ทุเรียนตกเกรดคงเหลือ (กก.)"
router.get("/stock", authenticate(), requireRole("owner"), async (req, res) => {
  const ownerId = getOwnerId(req);
  const remaining = await getDowngradedStockForOwner(ownerId);
  return res.json({ remaining });
});

// สร้างรายการ "แปรรูป"
const createSchema = z.object({
  method: z.enum(["ทอด", "แช่แข็ง", "กวน", "อบแห้ง", "อื่นๆ"]),
  amountKg: z.number().positive(),
  note: z.string().optional(),
  // (ถ้าภายหลังอยากแนบวันที่เอง ค่อยเพิ่ม .datetime() ได้)
});

router.post("/", authenticate(), requireRole("owner"), async (req, res) => {
  const parsed = createSchema.safeParse({
    method: req.body?.method,
    amountKg: Number(req.body?.amountKg),
    note: req.body?.note,
  });

  if (!parsed.success) {
    return res.status(400).json({ message: "ข้อมูลไม่ถูกต้อง", details: parsed.error.flatten() });
  }

  // map ป้ายภาษาไทย -> enum code (fry/freeze/jam/dry/other)
  const methodCode = normalizeFruitFlowCode(parsed.data.method);
  if (!PROCESS_TYPES.includes(methodCode)) {
    return res.status(400).json({ message: "วิธีการแปรรูปไม่ถูกต้อง" });
  }

  const ownerId = getOwnerId(req);

  // กันกรณีใส่เกินสต็อก
  const stock = await getDowngradedStockForOwner(ownerId);

  if (parsed.data.amountKg > stock) {
    return res.status(400).json({ message: "ปริมาณเกินกว่าทุเรียนตกเกรดคงเหลือ" });
  }

  // gen ไอดีผลไม้
  const nextId = await (async () => {
    const last = await prisma.durianFruit.findMany({ orderBy: { fruitId: "desc" }, take: 1 });
    if (!last.length) return "F001";
    const numeric = parseInt(String(last[0].fruitId).replace(/^F/, ""), 10) || 0;
    return `F${String(numeric + 1).padStart(3, "0")}`;
  })();

  // บันทึกแถว "แปรรูป" ลง durian_fruit
  // - ใส่ grade: fallen
  // - type: methodCode
  // - ownerId: เจ้าของที่ล็อกอินอยู่
  // - brokerId: null (เพราะเจ้าของเป็นคนทำ)
  const rec = await prisma.durianFruit.create({
    data: {
      fruitId: nextId,
      treeId: "PROCESS",          // ไม่มีต้นไม้จริง กำหนดค่า marker สั้น ๆ
      ownerId,
      brokerId: null,
      grade: FruitGrade.fallen,
      amount: parsed.data.amountKg,
      type: methodCode,
      date: new Date(),
    },
  });

  return res.status(201).json({ data: mapFruit(rec) });
});

// (ตัวเลือก) รายการแปรรูปล่าสุดของ owner (ถ้าต้องใช้)
router.get("/recent", authenticate(), requireRole("owner"), async (req, res) => {
  const ownerId = getOwnerId(req);
  const rows = await prisma.durianFruit.findMany({
    where: { ownerId, type: { in: PROCESS_TYPES } },
    orderBy: { date: "desc" },
    take: 50,
  });
  res.json({ data: rows.map(mapFruit) });
});

export default router;
