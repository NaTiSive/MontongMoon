// server/src/routes/activities.routes.js
import { Router } from "express";
import { z } from "zod";
import prisma from "../config/prisma.js";
import { authenticate, requireRole } from "../middleware/auth.js";

const router = Router();

/* ──────────────────────────────────────────────────────────────────────────
 * Helpers
 * ────────────────────────────────────────────────────────────────────────── */

const SCOPE_THAI_TO_ENUM = { "รายต้น": "tree", "ภาพรวม": "overview" };
const TYPE_THAI_TO_ENUM = {
  "ดูแลรักษา": "maintenance",
  "ออกดอก": "flowering",
  "ออกผล": "fruiting",
  "เก็บเกี่ยว": "harvest",
  "อื่นๆ": "other",
};
const TYPE_ENUM_TO_THAI = {
  maintenance: "ดูแลรักษา",
  flowering: "ออกดอก",
  fruiting: "ออกผล",
  harvest: "เก็บเกี่ยว",
  other: "อื่นๆ",
};

function normalizeScope(input) {
  if (!input) return "tree";
  if (["tree", "overview"].includes(input)) return input;
  return SCOPE_THAI_TO_ENUM[input] ?? "tree";
}
function normalizeType(input) {
  if (!input) return "other";
  if (["maintenance", "flowering", "fruiting", "harvest", "other"].includes(input))
    return input;
  return TYPE_THAI_TO_ENUM[input] ?? "other";
}
function nextTreeStatus(activityTypeEnum) {
  if (activityTypeEnum === "flowering") return "flowering";
  if (activityTypeEnum === "fruiting") return "fruiting";
  return "normal";
}
function getAuthId(user) {
  return user?.sub ?? user?.id ?? null;
}
async function generateActivityId() {
  const last = await prisma.activity.findFirst({
    orderBy: { activityId: "desc" },
    select: { activityId: true },
  });
  if (!last?.activityId) return "A001";
  const num = parseInt(String(last.activityId).replace(/^A/i, ""), 10) || 0;
  return `A${String(num + 1).padStart(3, "0")}`;
}

/* ──────────────────────────────────────────────────────────────────────────
 * Schemas
 * ────────────────────────────────────────────────────────────────────────── */

const CreateActivitySchema = z.object({
  tree_id: z.string().min(1),
  type: z.union([z.enum(["รายต้น", "ภาพรวม"]), z.enum(["tree", "overview"])]),
  activity_type: z.union([
    z.enum(["ดูแลรักษา", "ออกดอก", "ออกผล", "เก็บเกี่ยว", "อื่นๆ"]),
    z.enum(["maintenance", "flowering", "fruiting", "harvest", "other"]),
  ]),
  note: z.string().max(1000).optional(),
  date: z.string().datetime().optional(), // ไม่ส่ง = ใช้ปัจจุบัน
});

const ListQuerySchema = z.object({
  broker_id: z.string().optional(),
  owner_id: z
    .string()
    .transform((v) => (v == null || v === "" ? undefined : Number(v)))
    .optional(),
  tree_id: z.string().optional(),
  date_from: z.string().optional(), // YYYY-MM-DD
  date_to: z.string().optional(),
});

/* ──────────────────────────────────────────────────────────────────────────
 * GET /api/activities
 * ────────────────────────────────────────────────────────────────────────── */

router.get("/", authenticate(), async (req, res) => {
  try {
    const q = ListQuerySchema.parse(req.query ?? {});
    const where = {};
    const role = String(req.user?.role || "").toLowerCase();
    const sub = getAuthId(req.user);

    // default filter by role (กันเคส sub เพี้ยน)
    if (role === "broker" && sub) {
      where.brokerId = String(sub);
    } else if (role === "owner" && sub != null && !Number.isNaN(Number(sub))) {
      where.ownerId = Number(sub);
    }

    // optional overrides from query (เฉพาะที่มีค่าเท่านั้น)
    if (q.broker_id) where.brokerId = String(q.broker_id);
    if (typeof q.owner_id === "number" && !Number.isNaN(q.owner_id)) {
      where.ownerId = q.owner_id;
    }
    if (q.tree_id) where.treeId = String(q.tree_id);

    // date range (validate คร่าว ๆ)
    if (q.date_from || q.date_to) {
      const range = {};
      if (q.date_from && !Number.isNaN(new Date(q.date_from).valueOf())) {
        range.gte = new Date(q.date_from);
      }
      if (q.date_to && !Number.isNaN(new Date(q.date_to).valueOf())) {
        const to = new Date(q.date_to);
        to.setDate(to.getDate() + 1); // ครอบคลุมทั้งวัน
        range.lt = to;
      }
      if (Object.keys(range).length) where.date = range;
    }

    const rows = await prisma.activity.findMany({
      where,
      orderBy: [{ date: "desc" }, { activityId: "desc" }],
    });

    const data = rows.map((r) => ({
      id: r.activityId,
      tree_id: r.treeId,
      type: TYPE_ENUM_TO_THAI[r.activityType] ?? r.activityType,
      note: r.note ?? "",
      created_at: r.date,
      broker_id: r.brokerId, // สำหรับ OwnerActivities
    }));

    return res.json({ data });
  } catch (err) {
    console.error("GET /activities error:", err);
    return res.status(500).json({ message: "Failed to list activities" });
  }
});

/* ──────────────────────────────────────────────────────────────────────────
 * POST /api/activities (broker เท่านั้น)
 * ────────────────────────────────────────────────────────────────────────── */

router.post("/", authenticate(), requireRole("broker"), async (req, res) => {
  try {
    const { tree_id, type, activity_type, note, date } =
      CreateActivitySchema.parse(req.body);

    const tree = await prisma.durianTree.findUnique({
      where: { treeId: String(tree_id) },
      select: { treeId: true, ownerId: true },
    });
    if (!tree) return res.status(404).json({ message: "ไม่พบทรี (tree_id) นี้" });

    const activityId = await generateActivityId();
    const brokerId = String(getAuthId(req.user));
    const scopeEnum = normalizeScope(type);
    const typeEnum = normalizeType(activity_type);
    const newStatus = nextTreeStatus(typeEnum);

    const [created] = await prisma.$transaction([
      prisma.activity.create({
        data: {
          activityId,
          brokerId,
          ownerId: tree.ownerId,
          treeId: tree.treeId,
          date: new Date(date || Date.now()),
          type: scopeEnum,
          activityType: typeEnum,
          note: note ?? "",
        },
      }),
      prisma.durianTree.update({
        where: { treeId: tree.treeId },
        data: { status: newStatus },
      }),
    ]);

    return res.status(201).json({
      data: {
        id: created.activityId,
        tree_id: created.treeId,
        type: TYPE_ENUM_TO_THAI[created.activityType] ?? created.activityType,
        note: created.note ?? "",
        created_at: created.date,
        broker_id: created.brokerId,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res
        .status(400)
        .json({ message: "ข้อมูลไม่ถูกต้อง", issues: err.issues });
    }
    console.error("POST /activities error:", err);
    return res.status(500).json({ message: "Failed to create activity" });
  }
});

export default router;
