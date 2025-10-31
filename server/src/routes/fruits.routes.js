import { Router } from "express";
import { z } from "zod";
import prisma from "../config/prisma.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { mapFruit } from "../utils/formatters.js";

const router = Router();

router.get("/", authenticate(), async (req, res) => {
  const { broker_id: brokerIdParam, type } = req.query;
  const where = {};

  if (req.user.role === "broker") {
    where.brokerId = req.user.id;
  }

  if (brokerIdParam) {
    where.brokerId = Number(brokerIdParam);
  }

  if (type) {
    where.type = type;
  }

  const fruits = await prisma.fruitRecord.findMany({
    where,
    orderBy: { harvestAt: "desc" },
  });

  res.json({ data: fruits.map(mapFruit) });
});

router.get("/harvest", authenticate(), async (req, res) => {
  const { broker_id: brokerIdParam, start, end } = req.query;
  const where = {
    NOT: { type: "ส่งออก" },
  };

  if (req.user.role === "broker") {
    where.brokerId = req.user.id;
  }

  if (brokerIdParam) {
    where.brokerId = Number(brokerIdParam);
  }

  if (start) {
    const startDate = new Date(start);
    if (!isNaN(startDate)) where.harvestAt = { ...(where.harvestAt || {}), gte: startDate };
  }
  if (end) {
    const endDate = new Date(end);
    if (!isNaN(endDate)) where.harvestAt = { ...(where.harvestAt || {}), lte: endDate };
  }

  const fruits = await prisma.fruitRecord.findMany({
    where,
    orderBy: { harvestAt: "desc" },
  });

  res.json({ data: fruits.map(mapFruit) });
});

const harvestSchema = z.object({
  grade: z.enum(["A", "B", "C", "ตกเกรด"]),
  weight_kg: z.number().positive(),
  note: z.string().optional(),
});

router.post("/harvest", authenticate(), requireRole("broker", "owner"), async (req, res) => {
  const parsed = harvestSchema.safeParse({
    grade: req.body.grade,
    weight_kg: Number(req.body.weight_kg),
    note: req.body.note,
  });
  if (!parsed.success) {
    return res.status(400).json({ message: "ข้อมูลไม่ถูกต้อง", details: parsed.error.flatten() });
  }

  const { grade, weight_kg, note } = parsed.data;
  const brokerId = req.user.role === "broker" ? req.user.id : req.body.broker_id ?? null;

  const record = await prisma.fruitRecord.create({
    data: {
      brokerId: brokerId != null ? Number(brokerId) : null,
      grade,
      weightKg: weight_kg,
      note: note || "",
      type: "เก็บเกี่ยว",
    },
  });

  res.status(201).json({ data: mapFruit(record) });
});

export default router;
