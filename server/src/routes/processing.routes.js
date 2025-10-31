import { Router } from "express";
import { z } from "zod";
import prisma from "../config/prisma.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { FRUIT_PROCESS_METHOD_LABELS, mapFruit, toNumberSafe } from "../utils/formatters.js";

const router = Router();

const PROCESS_METHOD_INPUT = Object.fromEntries(
  Object.entries(FRUIT_PROCESS_METHOD_LABELS).map(([code, label]) => [label, code])
);

const PROCESS_TYPE_VALUES = Object.keys(FRUIT_PROCESS_METHOD_LABELS);

router.get("/stock", authenticate(), requireRole("owner"), async (req, res) => {
  const ownerId = Number(req.user.id);
  const downgradedHarvest = await prisma.durianFruit.aggregate({
    _sum: { amount: true },
    where: {
      ownerId,
      grade: "fallen",
      NOT: { type: { in: [...PROCESS_TYPE_VALUES, "export"] } },
    },
  });

  const processed = await prisma.durianFruit.aggregate({
    _sum: { amount: true },
    where: { ownerId, type: { in: PROCESS_TYPE_VALUES } },
  });

  const available = Math.max(0, toNumberSafe(downgradedHarvest._sum.amount) - toNumberSafe(processed._sum.amount));
  res.json({ downgraded_stock: available });
});

const processSchema = z.object({
  method: z.enum(Object.keys(PROCESS_METHOD_INPUT)),
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

  const { method, amountKg, tree_id } = parsed.data;
  const ownerId = Number(req.user.id);

  const stockResp = await prisma.durianFruit.aggregate({
    _sum: { amount: true },
    where: {
      ownerId,
      grade: "fallen",
      NOT: { type: { in: [...PROCESS_TYPE_VALUES, "export"] } },
    },
  });
  const processedResp = await prisma.durianFruit.aggregate({
    _sum: { amount: true },
    where: { ownerId, type: { in: PROCESS_TYPE_VALUES } },
  });

  const available = Math.max(0, toNumberSafe(stockResp._sum.amount) - toNumberSafe(processedResp._sum.amount));
  if (amountKg > available) {
    return res.status(400).json({ message: "ปริมาณเกินกว่าทุเรียนตกเกรดคงเหลือ" });
  }

  let targetTreeId = tree_id ? String(tree_id) : null;
  if (targetTreeId) {
    const tree = await prisma.durianTree.findUnique({
      where: { treeId: targetTreeId },
      select: { ownerId: true },
    });
    if (!tree || Number(tree.ownerId) !== ownerId) {
      return res.status(403).json({ message: "ไม่สามารถเลือกต้นทุเรียนนี้ได้" });
    }
  } else {
    const fallbackTree = await prisma.durianTree.findFirst({
      where: { ownerId },
      orderBy: { treeId: "asc" },
      select: { treeId: true },
    });
    targetTreeId = fallbackTree?.treeId || null;
  }

  const record = await prisma.durianFruit.create({
    data: {
      fruitId: await generateFruitId(),
      treeId: targetTreeId,
      ownerId,
      brokerId: null,
      grade: "fallen",
      amount: amountKg,
      type: PROCESS_METHOD_INPUT[method],
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
