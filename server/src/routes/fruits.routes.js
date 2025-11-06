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
import { computeNetStockByGrade, sumHarvestByGrade } from "../utils/fruits.js";

const router = Router();

/**
 * แผนที่ type ที่รับค่าภาษาไทยจาก UI → enum ของ Prisma
 */
const FRUIT_TYPE_INPUT = {
  "เก็บเกี่ยว": FruitFlowType.harvest,
  "ขนส่งออก": FruitFlowType.export,
};

const PROCESS_METHOD_INPUT = Object.fromEntries(
  Object.entries(FRUIT_PROCESS_METHOD_LABELS)
    .map(([code, label]) => [label, FruitFlowType[code]])
    .filter(([, value]) => Boolean(value))
);

const PROCESS_TYPE_VALUES = FRUIT_PROCESS_TYPE_CODES
  .map((code) => FruitFlowType[code])
  .filter(Boolean);

const FRUIT_GRADE_INPUT = {
  A: "A",
  B: "B",
  C: "C",
  "ตกเกรด": "fallen",
};

/**
 * ดึงรายการผลผลิตทั้งหมด (รองรับ filter: broker, type)
 */
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

/**
 * ดึงรายการ “เก็บเกี่ยว” (รองรับช่วงวันที่ และ tree/broker)
 */
router.get("/harvest", authenticate(), async (req, res) => {
  const { broker_id: brokerIdParam, tree_id: treeIdParam, start, end } = req.query;
  const where = { type: FruitFlowType.harvest };

  if (req.user.role === "broker") {
    where.brokerId = req.user.id;
  }
  if (brokerIdParam) {
    where.brokerId = String(brokerIdParam);
  }
  if (treeIdParam) {
    where.treeId = String(treeIdParam);
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

/**
 * สรุปรวม “เก็บเกี่ยว” ตามเกรด (A/B/C) พร้อม filter
 */
router.get("/harvest/summary", authenticate(), async (req, res) => {
  const { broker_id: brokerIdParam, tree_id: treeIdParam, start, end } = req.query;

  let brokerId = null;
  if (req.user.role === "broker") {
    brokerId = req.user.id;
  }
  if (brokerIdParam) {
    brokerId = String(brokerIdParam);
  }

  let treeId = null;
  if (treeIdParam) {
    treeId = String(treeIdParam);
  }

  let startDate;
  if (start) {
    const parsed = new Date(start);
    if (!Number.isNaN(parsed.getTime())) startDate = parsed;
  }

  let endDate;
  if (end) {
    const parsed = new Date(end);
    if (!Number.isNaN(parsed.getTime())) endDate = parsed;
  }

  // ownerId: ให้ผูกกับผู้ใช้งานจริง (ปัจจุบันระบบ single-owner = 1)
  const ownerId = req.user.role === "owner" ? req.user.id : 1;

  const summary = await sumHarvestByGrade({
    brokerId,
    ownerId,
    treeId,
    start: startDate,
    end: endDate,
  });

  res.json({ summary });
});

router.get("/harvest/stock", authenticate(), async (req, res) => {
  const { broker_id: brokerIdParam, tree_id: treeIdParam, start, end } = req.query;

  let brokerId = null;
  if (req.user.role === "broker") {
    brokerId = req.user.id;
  }
  if (brokerIdParam) {
    brokerId = String(brokerIdParam);
  }

  let treeId = null;
  if (treeIdParam) {
    treeId = String(treeIdParam);
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

  const ownerId = req.user.role === "owner" ? req.user.id : null;
  const stock = await computeNetStockByGrade({
    ownerId,
    brokerId,
    treeId,
    start: startDate,
    end: endDate,
  });

  res.json({ stock });
});

/**
 * สร้างรายการเก็บเกี่ยวใหม่
 * - ถ้า Broker เป็นคนบันทึก → ใช้ brokerId ผู้ล็อกอิน
 * - ถ้า Owner เป็นคนบันทึก → ผูก brokerId กับสัญญาที่ “ยอมรับ” ล่าสุดอัตโนมัติ
 */
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
  const ownerId = 1; // ระบบตอนนี้มี owner คนเดียว

  let brokerId = null;
  if (req.user.role === "broker") {
    brokerId = req.user.id;
  } else {
    brokerId = await getAcceptedBrokerId(ownerId);
    if (!brokerId) {
      return res.status(409).json({ message: "ยังไม่มีโบรกเกอร์ที่ถูกยอมรับในขณะนี้" });
    }
  }

  const record = await prisma.durianFruit.create({
    data: {
      fruitId: await generateFruitId(),
      treeId: tree_id,
      ownerId,
      brokerId,
      grade: FRUIT_GRADE_INPUT[grade],
      amount: weight_kg,
      type: FruitFlowType.harvest,
      date: date ? new Date(date) : new Date(),
    },
  });

  res.status(201).json({ data: mapFruit(record) });
});

/**
 * Helper: หา broker ที่สัญญาถูก accepted ล่าสุดของ owner
 */
async function getAcceptedBrokerId(ownerId = 1) {
  const c = await prisma.contract.findFirst({
    where: { ownerId, status: "accepted" },
    orderBy: { contractDate: "desc" },
    select: { brokerId: true },
  });
  return c?.brokerId ?? null;
}

/**
 * Helper: สร้าง fruit_id ใหม่แบบรันนิ่ง
 */
async function generateFruitId() {
  const last = await prisma.durianFruit.findMany({
    orderBy: { fruitId: "desc" },
    take: 1,
  });
  if (!last.length) return "F001";
  const current = last[0].fruitId;
  const numeric = parseInt(current.replace(/^F/, ""), 10) || 0;
  const next = numeric + 1;
  return `F${next.toString().padStart(3, "0")}`;
}

export default router;
