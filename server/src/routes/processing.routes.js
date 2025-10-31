import { Router } from "express";
import { z } from "zod";
import prisma from "../config/prisma.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { mapFruit, toNumberSafe } from "../utils/formatters.js";

const router = Router();

const PROCESSING_TYPES = ["ทอด", "แช่แข็ง", "กวน", "อบแห้ง", "อื่นๆ"];

router.get("/stock", authenticate(), requireRole("owner"), async (req, res) => {
  const downgradedHarvest = await prisma.durianFruit.aggregate({
     _sum: { amount: true },
    where: {
      grade: "fallen",
      NOT: { type: { in: PROCESSING_TYPES } },
    },
  });

  const processed = await prisma.durianFruit.aggregate({
    _sum: { amount: true },
    where: {
      grade: "fallen", // (จำเป็นต้องใส่เผื่อไว้)
      type: { in: PROCESSING_TYPES }, // หายอดรวมที่ถูกแปรรูปไปแล้ว
    },
  });

  const available = Math.max(0, toNumberSafe(downgradedHarvest._sum.amount) - toNumberSafe(processed._sum.amount));
  res.json({ downgraded_stock: available });
});

const processSchema = z.object({
  method: z.string().min(1),
  amountKg: z.number().positive(),
  tree_id: z.string().optional(),
});

router.post("/", authenticate(), requireRole("owner"), async (req, res) => {
  const parsed = processSchema.safeParse({
    method: req.body.method,
    amountKg: Number(req.body.amountKg ?? req.body.amount_kg ?? req.body.weight_kg),
    tree_id: req.body.tree_id,
  });
  if (!parsed.success) {
    return res.status(400).json({ message: "ข้อมูลไม่ถูกต้อง", details: parsed.error.flatten() });
  }
  const totalFallenIn = await prisma.durianFruit.aggregate({
    _sum: { amount: true }, where: { grade: "fallen", type: "เก็บเกี่ยว" }
  });
  const totalFallenUsed = await prisma.durianFruit.aggregate({
    _sum: { amount: true }, where: { grade: "fallen", type: { in: PROCESSING_TYPES } }
  });

  const { method, amountKg, tree_id } = parsed.data;
  const downgradedHarvest = await prisma.durianFruit.aggregate({
     _sum: { amount: true },
    where: {
      grade: "fallen",
      NOT: { type: { in: PROCESSING_TYPES } },
    },
  });

  const processed = await prisma.durianFruit.aggregate({
    _sum: { amount: true },
    where: {
      grade: "fallen", // (จำเป็นต้องใส่เผื่อไว้)
      type: { in: PROCESSING_TYPES }, // หายอดรวมที่ถูกแปรรูปไปแล้ว
    },
  });

  const available = Math.max(0, toNumberSafe(downgradedHarvest._sum.amount) - toNumberSafe(processed._sum.amount));
  if (amountKg > available) {
    return res.status(400).json({ message: "ปริมาณเกินกว่าทุเรียนตกเกรดคงเหลือ" });
  }

  const record = await prisma.durianFruit.create({
    data: {
      fruitId: await generateFruitId(),
      treeId: tree_id || "T-001",
      ownerId: 1,
      brokerId: null,
      grade: "fallen",
      amount: amountKg,
      type: method,
      date: new Date(),
    },
  });

  res.status(201).json({ data: mapFruit(record) });
});

async function generateFruitId() {
  const last = await prisma.durianFruit.findMany({ orderBy: { fruitId: "desc" }, take: 1 });
  if (!last.length) return "F001";
  const current = last[0].fruitId;
  const numeric = parseInt(current.replace(/^F/, ""), 10) || 0;
  const next = numeric + 1;
  return `F${next.toString().padStart(3, "0")}`;
}

export default router;
