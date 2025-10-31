import { Router } from "express";
import { z } from "zod";
import prisma from "../config/prisma.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { FruitFlowType, FruitGrade } from "@prisma/client";
import { mapFruit, normalizeFruitFlowCode } from "../utils/formatters.js";

const router = Router();

const PROCESS_TYPES = [
  FruitFlowType.fry,
  FruitFlowType.freeze,
  FruitFlowType.jam,
  FruitFlowType.dry,
  FruitFlowType.other,
];

// สต็อกตกเกรดคงเหลือ (ส่ง downgraded_stock)
router.get("/stock", authenticate(), requireRole("owner"), async (_req, res) => {
  const ownerId = 1;

  const harvested = await prisma.durianFruit.aggregate({
    where: { ownerId, grade: FruitGrade.fallen, type: FruitFlowType.harvest },
    _sum: { amount: true },
  });

  const processed = await prisma.durianFruit.aggregate({
    where: { ownerId, type: { in: PROCESS_TYPES } },
    _sum: { amount: true },
  });

  const totalHarvested = Number(harvested._sum.amount ?? 0);
  const totalProcessed = Number(processed._sum.amount ?? 0);
  const remaining = Math.max(0, totalHarvested - totalProcessed);

  return res.json({ downgraded_stock: remaining });
});

// (optional) debug endpoint
router.get("/debug/stock", authenticate(), requireRole("owner"), async (_req, res) => {
  const ownerId = 1;
  const harvested = await prisma.durianFruit.aggregate({
    where: { ownerId, grade: FruitGrade.fallen, type: FruitFlowType.harvest },
    _sum: { amount: true },
  });
  const processed = await prisma.durianFruit.aggregate({
    where: { ownerId, type: { in: PROCESS_TYPES } },
    _sum: { amount: true },
  });
  res.json({
    harvested_fallen_harvest: Number(harvested._sum.amount ?? 0),
    processed_total: Number(processed._sum.amount ?? 0),
    downgraded_stock: Math.max(
      0,
      Number(harvested._sum.amount ?? 0) - Number(processed._sum.amount ?? 0)
    ),
  });
});

// สร้างรายการแปรรูป
const createSchema = z.object({
  method: z.enum(["ทอด", "แช่แข็ง", "กวน", "อบแห้ง", "อื่นๆ"]),
  amountKg: z.number().positive(),
  note: z.string().optional(),
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

  const methodCode = normalizeFruitFlowCode(parsed.data.method);
  if (!PROCESS_TYPES.includes(methodCode)) {
    return res.status(400).json({ message: "วิธีการแปรรูปไม่ถูกต้อง" });
  }

  const ownerId = 1;

  // กันใส่เกินสต็อก
  const harvested = await prisma.durianFruit.aggregate({
    where: { ownerId, grade: FruitGrade.fallen, type: FruitFlowType.harvest },
    _sum: { amount: true },
  });
  const processed = await prisma.durianFruit.aggregate({
    where: { ownerId, type: { in: PROCESS_TYPES } },
    _sum: { amount: true },
  });
  const stock = Math.max(0, Number(harvested._sum.amount ?? 0) - Number(processed._sum.amount ?? 0));
  if (parsed.data.amountKg > stock) {
    return res.status(400).json({ message: "ปริมาณเกินกว่าทุเรียนตกเกรดคงเหลือ" });
  }

  // gen ไอดี
  const last = await prisma.durianFruit.findMany({ orderBy: { fruitId: "desc" }, take: 1 });
  const nextId =
    last.length === 0
      ? "F001"
      : `F${(parseInt(String(last[0].fruitId).replace(/^F/, ""), 10) + 1)
          .toString()
          .padStart(3, "0")}`;

  const rec = await prisma.durianFruit.create({
    data: {
      fruitId: nextId,
      treeId: "PROCESS",
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

// รายการแปรรูปล่าสุด
router.get("/recent", authenticate(), requireRole("owner"), async (_req, res) => {
  const rows = await prisma.durianFruit.findMany({
    where: { ownerId: 1, type: { in: PROCESS_TYPES } },
    orderBy: { date: "desc" },
    take: 50,
  });
  res.json({ data: rows.map(mapFruit) });
});

export default router;
