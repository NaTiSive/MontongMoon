import { Router } from "express";
import { z } from "zod";
import prisma from "../config/prisma.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { mapActivity } from "../utils/formatters.js";

const router = Router();

const ACTIVITY_SCOPE_INPUT = {
  "รายต้น": "tree",
  "ภาพรวม": "overview",
};

const ACTIVITY_TYPE_INPUT = {
  "ดูแลรักษา": "maintenance",
  "ออกดอก": "flowering",
  "ออกผล": "fruiting",
  "เก็บเกี่ยว": "harvest",
  "อื่นๆ": "other",
};

/* ────────────────────────────────
 * GET /api/activities
 * ──────────────────────────────── */
router.get("/", authenticate(), async (req, res) => {
  const { broker_id: brokerIdParam } = req.query;

  const where = {};
  if (req.user.role === "broker") {
    // Prisma field name = camelCase
    where.brokerId = String(req.user.id);
  }
  if (brokerIdParam) {
    where.brokerId = String(brokerIdParam);
  }

  const activities = await prisma.activity.findMany({
    where,
    orderBy: { date: "desc" },
  });

  // mapActivity ควรรับ record จาก Prisma (camelCase) แล้วแปลงเป็นคีย์ที่ FE ใช้
  res.json({ data: activities.map(mapActivity) });
});

/* ────────────────────────────────
 * POST /api/activities
 * ──────────────────────────────── */
const createSchema = z.object({
  // FE อาจส่ง tree_id มา แต่ใน schema Activity ไม่มีฟิลด์นี้
  tree_id: z.string().optional(), // ← รับไว้เฉย ๆ (เผื่ออนาคต), ไม่ส่งเข้า Prisma
  type: z.enum(["รายต้น", "ภาพรวม"]),
  activity_type: z.enum(["ดูแลรักษา", "ออกดอก", "ออกผล", "เก็บเกี่ยว", "อื่นๆ"]),
  note: z.string().optional(),
  date: z.string().datetime().optional(),
});

router.post("/", authenticate(), requireRole("broker"), async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: "ข้อมูลไม่ถูกต้อง",
      details: parsed.error.flatten(),
    });
  }

  const payload = parsed.data;

  const aid = await generateActivityId();
  const brokerId = String(req.user.id);
  const scope = ACTIVITY_SCOPE_INPUT[payload.type] ?? "tree";
  const category = ACTIVITY_TYPE_INPUT[payload.activity_type] ?? "other";

  // ⛔️ อย่าส่ง tree_id/treeId ให้ Prisma: ไม่มีใน model Activity
  const rec = await prisma.activity.create({
    data: {
      activityId: aid,
      brokerId,
      ownerId: 1, // TODO: หากต้องผูก Owner จริง ให้คำนวณ/ดึงจากบริบทของระบบ
      type: scope,              // "tree" | "overview"
      activityType: category,   // "maintenance" | "flowering" | ...
      note: payload.note ?? "",
      date: new Date(payload.date || Date.now()),
    },
  });

  res.status(201).json({ data: mapActivity(rec) });
});

async function generateActivityId() {
  // ใช้ field camelCase ตาม Prisma
  const last = await prisma.activity.findFirst({
    orderBy: { activityId: "desc" },
  });
  if (!last) return "A001";
  const current = String(last.activityId || "");
  const numeric = parseInt(current.replace(/^A/i, ""), 10) || 0;
  return `A${String(numeric + 1).padStart(3, "0")}`;
}

export default router;
