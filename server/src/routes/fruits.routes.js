import { Router } from "express";
import { z } from "zod";
import prisma from "../config/prisma.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import {
  FRUIT_PROCESS_METHOD_LABELS,
  FRUIT_PROCESS_TYPE_CODES,
  mapFruit,
} from "../utils/formatters.js";
import { sumHarvestByGrade } from "../utils/fruits.js";

const router = Router();

const FRUIT_TYPE_INPUT = {
  "เก็บเกี่ยว": "harvest",
  "ขนส่งออก": "export",
};

const PROCESS_METHOD_INPUT = Object.fromEntries(
  Object.entries(FRUIT_PROCESS_METHOD_LABELS).map(([code, label]) => [label, code])
);

const PROCESS_TYPE_VALUES = FRUIT_PROCESS_TYPE_CODES;

const FRUIT_GRADE_INPUT = {
  A: "A",
  B: "B",
  C: "C",
  "ตกเกรด": "fallen",
};

router.get("/", authenticate(), async (req, res) => {
  const { broker_id: brokerIdParam, type } = req.query;
  const where = {};

  if (req.user.role === "broker") {
    where.brokerId = req.user.id;
  }

  if (brokerIdParam) {
    where.brokerId = String(brokerIdParam);
  }

  if (type) {
    if (type === "แปรรูป") {
      where.type = { in: PROCESS_TYPE_VALUES };
    } else if (FRUIT_TYPE_INPUT[type]) {
      where.type = FRUIT_TYPE_INPUT[type];
    } else if (PROCESS_METHOD_INPUT[type]) {
      where.type = PROCESS_METHOD_INPUT[type];
    }
  }

  const fruits = await prisma.durianFruit.findMany({
    where,
    orderBy: { date: "desc" },
  });

  res.json({ data: fruits.map(mapFruit) });
});

router.get("/harvest", authenticate(), async (req, res) => {
  const { broker_id: brokerIdParam, start, end } = req.query;
  const where = { NOT: { type: { in: ["export", ...PROCESS_TYPE_VALUES] } } };

  if (req.user.role === "broker") {
    where.brokerId = req.user.id;
  }

  if (brokerIdParam) {
    where.brokerId = String(brokerIdParam);
  }

  if (start) {
    const startDate = new Date(start);
    if (!Number.isNaN(startDate.getTime())) {
      where.date = { ...(where.date || {}), gte: startDate };
    }
  }
  if (end) {
    const endDate = new Date(end);
    if (!Number.isNaN(endDate.getTime())) {
      where.date = { ...(where.date || {}), lte: endDate };
    }
  }

  const fruits = await prisma.durianFruit.findMany({
    where,
    orderBy: { date: "desc" },
  });

  res.json({ data: fruits.map(mapFruit) });
});

router.get("/harvest/summary", authenticate(), async (req, res) => {
  const { broker_id: brokerIdParam, start, end } = req.query;
  let brokerId = null;
  if (req.user.role === "broker") {
    brokerId = req.user.id;
  }
  if (brokerIdParam) {
    brokerId = String(brokerIdParam);
  }

  let startDate;
  if (start) {
    const parsed = new Date(start);
    if (!Number.isNaN(parsed.getTime())) {
      startDate = parsed;
    }
  }

  let endDate;
  if (end) {
    const parsed = new Date(end);
    if (!Number.isNaN(parsed.getTime())) {
      endDate = parsed;
    }
  }

  const summary = await sumHarvestByGrade({ brokerId, ownerId: 1, start: startDate, end: endDate });
  res.json({ summary });
});

const harvestSchema = z.object({
  tree_id: z.string().min(1),
  grade: z.enum(["A", "B", "C", "ตกเกรด"]),
  weight_kg: z.number().positive(),
  date: z.string().datetime().optional(),
});

router.post("/harvest", authenticate(), requireRole("broker", "owner"), async (req, res) => {
  const parsed = harvestSchema.safeParse({
    tree_id: req.body.tree_id,
    grade: req.body.grade,
    weight_kg: Number(req.body.weight_kg),
    date: req.body.date,
  });
  if (!parsed.success) {
    return res.status(400).json({ message: "ข้อมูลไม่ถูกต้อง", details: parsed.error.flatten() });
  }

  const { tree_id, grade, weight_kg, date } = parsed.data;
  const brokerId = req.user.role === "broker" ? req.user.id : req.body.broker_id ? String(req.body.broker_id) : null;

  const record = await prisma.durianFruit.create({
    data: {
      fruitId: await generateFruitId(),
      treeId: tree_id,
      ownerId: 1,
      brokerId,
      grade: FRUIT_GRADE_INPUT[grade],
      amount: weight_kg,
      type: "harvest",
      date: date ? new Date(date) : new Date(),
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
