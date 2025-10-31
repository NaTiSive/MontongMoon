import { Router } from "express";
import { z } from "zod";
import { FruitFlowType } from "@prisma/client";
import prisma from "../config/prisma.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import {
  FRUIT_PROCESS_METHOD_LABELS,
  FRUIT_PROCESS_TYPE_CODES,
  mapFruit,
} from "../utils/formatters.js";
import { sumHarvestByGrade } from "../utils/fruits.js";

const router = Router();

// label ไทย -> enum Prisma (ซึ่ง map เป็นไทยใน DB แล้ว)
const FRUIT_TYPE_INPUT = {
  "เก็บเกี่ยว": FruitFlowType.harvest,
  "ขนส่งออก": FruitFlowType.export,
};

// label กระบวนการ (ไทย) -> enum Prisma
const PROCESS_METHOD_INPUT = Object.fromEntries(
  Object.entries(FRUIT_PROCESS_METHOD_LABELS) // { fry:"ทอด", freeze:"แช่แข็ง", ... }
    .map(([code, label]) => [label, FruitFlowType[code]])
    .filter(([, val]) => !!val)
);

// รายการ enum กระบวนการ (อังกฤษ) -> Prisma enum list
const PROCESS_TYPE_VALUES = FRUIT_PROCESS_TYPE_CODES // ["fry","freeze","jam","dry","other"]
  .map((code) => FruitFlowType[code])
  .filter(Boolean);

const FRUIT_GRADE_INPUT = {
  A: "A",
  B: "B",
  C: "C",
  "ตกเกรด": "fallen",
};

function getBrokerIdFromUser(user) {
  if (!user) return null;
  return user.broker_id || user.id || null;
}

// GET /api/fruits
router.get("/", authenticate(), async (req, res) => {
  const { broker_id: brokerIdParam, type } = req.query;
  const where = {};

  if (req.user?.role === "broker") {
    where.brokerId = getBrokerIdFromUser(req.user);
  }
  if (brokerIdParam) where.brokerId = String(brokerIdParam);

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

// GET /api/fruits/harvest
router.get("/harvest", authenticate(), async (req, res) => {
  const { broker_id: brokerIdParam, tree_id: treeIdParam, start, end } = req.query;
  const where = { type: FruitFlowType.harvest };

  if (req.user?.role === "broker") {
    where.brokerId = getBrokerIdFromUser(req.user);
  }
  if (brokerIdParam) where.brokerId = String(brokerIdParam);
  if (treeIdParam) where.treeId = String(treeIdParam);

  if (start) {
    const d = new Date(start);
    if (!Number.isNaN(d.getTime())) where.date = { ...(where.date || {}), gte: d };
  }
  if (end) {
    const d = new Date(end);
    if (!Number.isNaN(d.getTime())) where.date = { ...(where.date || {}), lte: d };
  }

  const fruits = await prisma.durianFruit.findMany({
    where,
    orderBy: { date: "desc" },
  });

  res.json({ data: fruits.map(mapFruit) });
});

// GET /api/fruits/harvest/summary
router.get("/harvest/summary", authenticate(), async (req, res) => {
  const { broker_id: brokerIdParam, tree_id: treeIdParam, start, end } = req.query;

  let brokerId = null;
  if (req.user?.role === "broker") brokerId = getBrokerIdFromUser(req.user);
  if (brokerIdParam) brokerId = String(brokerIdParam);

  const treeId = treeIdParam ? String(treeIdParam) : null;
  const ownerId = req.user?.role === "owner" ? req.user.id : null;

  let startDate;
  if (start) {
    const d = new Date(start);
    if (!Number.isNaN(d.getTime())) startDate = d;
  }
  let endDate;
  if (end) {
    const d = new Date(end);
    if (!Number.isNaN(d.getTime())) endDate = d;
  }

  const summary = await sumHarvestByGrade({
    brokerId,
    ownerId,
    treeId,
    start: startDate,
    end: endDate,
    // ภายใน util ควรกำหนด where.type = FruitFlowType.harvest ด้วย
  });

  res.json({ summary });
});

const harvestSchema = z.object({
  tree_id: z.string().min(1),
  grade: z.enum(["A", "B", "C", "ตกเกรด"]),
  weight_kg: z.number().positive(),
  date: z.string().datetime().optional(),
});

// POST /api/fruits/harvest
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
  const brokerId =
    req.user?.role === "broker"
      ? getBrokerIdFromUser(req.user)
      : req.body.broker_id
      ? String(req.body.broker_id)
      : null;

  const record = await prisma.durianFruit.create({
    data: {
      fruitId: await generateFruitId(),
      treeId: tree_id,
      ownerId: 1,
      brokerId,
      grade: FRUIT_GRADE_INPUT[grade], // "A"|"B"|"C"|"fallen"
      amount: weight_kg,
      type: FruitFlowType.harvest,
      date: date ? new Date(date) : new Date(),
    },
  });

  res.status(201).json({ data: mapFruit(record) });
});

async function generateFruitId() {
  const last = await prisma.durianFruit.findMany({
    orderBy: { fruitId: "desc" },
    take: 1,
  });
  if (!last.length) return "F001";
  const numeric = parseInt(String(last[0].fruitId).replace(/^F/, ""), 10) || 0;
  return `F${String(numeric + 1).padStart(3, "0")}`;
}

export default router;
