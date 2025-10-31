import { Router } from "express";
import { z } from "zod";
import prisma from "../config/prisma.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { mapFruit, toNumberSafe } from "../utils/formatters.js";

const router = Router();

router.get("/stock", authenticate(), requireRole("owner"), async (req, res) => {
  const downgradedHarvest = await prisma.fruitRecord.aggregate({
    _sum: { weightKg: true },
    where: {
      grade: "ตกเกรด",
      NOT: { type: { in: ["แปรรูป", "ส่งออก"] } },
    },
  });

  const processed = await prisma.fruitRecord.aggregate({
    _sum: { weightKg: true },
    where: { type: "แปรรูป" },
  });

  const available = Math.max(0, toNumberSafe(downgradedHarvest._sum.weightKg) - toNumberSafe(processed._sum.weightKg));
  res.json({ downgraded_stock: available });
});

const processSchema = z.object({
  method: z.string().min(1),
  amountKg: z.number().positive(),
  note: z.string().optional(),
});

router.post("/", authenticate(), requireRole("owner"), async (req, res) => {
  const parsed = processSchema.safeParse({
    method: req.body.method,
    amountKg: Number(req.body.amountKg ?? req.body.amount_kg ?? req.body.weight_kg),
    note: req.body.note,
  });
  if (!parsed.success) {
    return res.status(400).json({ message: "ข้อมูลไม่ถูกต้อง", details: parsed.error.flatten() });
  }

  const { method, amountKg, note } = parsed.data;
  const stockResp = await prisma.fruitRecord.aggregate({
    _sum: { weightKg: true },
    where: {
      grade: "ตกเกรด",
      NOT: { type: { in: ["แปรรูป", "ส่งออก"] } },
    },
  });
  const processedResp = await prisma.fruitRecord.aggregate({
    _sum: { weightKg: true },
    where: { type: "แปรรูป" },
  });

  const available = Math.max(0, toNumberSafe(stockResp._sum.weightKg) - toNumberSafe(processedResp._sum.weightKg));
  if (amountKg > available) {
    return res.status(400).json({ message: "ปริมาณเกินกว่าทุเรียนตกเกรดคงเหลือ" });
  }

  const record = await prisma.fruitRecord.create({
    data: {
      grade: "ตกเกรด",
      type: "แปรรูป",
      weightKg: amountKg,
      processMethod: method,
      note: note || "",
    },
  });

  res.status(201).json({ data: mapFruit(record) });
});

export default router;
