// server/src/routes/problems.routes.js
import { Router } from "express";
import { z } from "zod";
import prisma from "../config/prisma.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { mapProblem } from "../utils/formatters.js";

const router = Router();

const PROBLEM_SCOPE_INPUT = {
  "รายต้น": "tree",
  "ภาพรวม": "overview",
  "ทั้งสวน": "overview", // ✅ รองรับข้อความจากหน้า FE
};

const PROBLEM_STATUS = {
  open: "pending",
  progress: "inProgress",
  resolved: "resolved",
};

/* -------------------------- Utilities -------------------------- */
function parseTypeFromDesc(desc = "") {
  const s = String(desc || "");
  if (/^\[รายต้น\]/u.test(s)) return "รายต้น";
  if (/^\[(ทั้งสวน|ภาพรวม)\]/u.test(s)) return "ทั้งสวน";
  return null;
}
function stripTypePrefix(desc = "") {
  return String(desc || "").replace(/^\[(รายต้น|ทั้งสวน|ภาพรวม)\]\s*/u, "");
}

async function generateProblemId() {
  const last = await prisma.problem.findMany({ orderBy: { problemId: "desc" }, take: 1 });
  if (!last.length) return "P001";
  const current = last[0].problemId;
  const numeric = parseInt(current.replace(/^P/, ""), 10) || 0;
  const next = numeric + 1;
  return `P${next.toString().padStart(3, "0")}`;
}

/* ---------------------------- Routes --------------------------- */
// GET /problems
router.get("/", authenticate(), async (req, res) => {
  const where = {};
  if (req.user.role === "broker") {
    where.brokerId = String(req.user.broker_id || req.user.id); // ✅ ใช้ broker_id ก่อน
  }

  const problems = await prisma.problem.findMany({
    where,
    orderBy: { problemId: "desc" },
  });

  res.json({ data: problems.map(mapProblem) });
});

// สร้าง rule แบบยืดหยุ่น: รับได้ทั้ง (type + note_broker) หรือ (description)
const createSchema = z.object({
  tree_id: z.string().optional().nullable(),
  type: z.enum(["รายต้น", "ภาพรวม", "ทั้งสวน"]).optional(),
  note_broker: z.string().optional(),      // เคสเดิมของ API
  description: z.string().optional(),      // เคสที่ FE ส่งมา
}).refine((v) => {
  // ต้องมีอย่างน้อยหนึ่ง: note_broker หรือ description
  return (v.note_broker && v.note_broker.trim()) || (v.description && v.description.trim());
}, { message: "กรุณากรอกรายละเอียดปัญหา" });

/**
 * POST /problems   (broker รายงานปัญหา)
 * รองรับ 2 รูปแบบ:
 * 1) { type: "รายต้น"|"ทั้งสวน", note_broker: "ข้อความ", tree_id? }
 * 2) { description: "[รายต้น] ใบไหม้...", tree_id? }  ← จากหน้า BrokerReportProblem.jsx
 */
router.post("/", authenticate(), requireRole("broker"), async (req, res) => {
  const parsed = createSchema.safeParse({
    tree_id: req.body.tree_id ?? null,
    type: req.body.type,
    note_broker: req.body.note_broker,
    description: req.body.description,
  });
  if (!parsed.success) {
    return res.status(400).json({ message: "ข้อมูลไม่ถูกต้อง", details: parsed.error.flatten() });
  }

  // เลือกประเภท
  let inputType = parsed.data.type || parseTypeFromDesc(parsed.data.description || "");
  if (!inputType) inputType = "ทั้งสวน"; // ดีฟอลต์เป็นภาพรวมถ้าไม่ระบุและไม่มี prefix

  // รายละเอียด: ใช้ note_broker ถ้ามี, ไม่งั้นตัด prefix ออกจาก description
  const detail = (parsed.data.note_broker && parsed.data.note_broker.trim())
    ? parsed.data.note_broker.trim()
    : stripTypePrefix(parsed.data.description || "");

  // หากเป็นรายต้น แต่ไม่ได้ส่ง tree_id — ตั้งค่าเป็นค่า placeholder ที่มีอยู่แน่ ๆ (หรือให้เป็น null ก็ได้)
  const treeId = inputType === "รายต้น" ? (parsed.data.tree_id || "T-001") : (parsed.data.tree_id || null);

  const problem = await prisma.problem.create({
    data: {
      problemId: await generateProblemId(),
      brokerId: String(req.user.broker_id || req.user.id), // ✅ ใช้ broker_id
      ownerId: 1,
      treeId: treeId,
      type: PROBLEM_SCOPE_INPUT[inputType] || "overview",
      noteBroker: detail,
      status: PROBLEM_STATUS.open, // เริ่มเป็น "pending" → mapProblem แปลงเป็น "เปิดปัญหา"
    },
  });

  res.status(201).json({ data: mapProblem(problem) });
});

// Owner มอบหมาย/ใส่โน้ต → สถานะ progress
const assignSchema = z.object({ note: z.string().optional() });
router.patch("/:id/assign", authenticate(), requireRole("owner"), async (req, res) => {
  const parsed = assignSchema.safeParse({ note: req.body.note });
  if (!parsed.success) {
    return res.status(400).json({ message: "ข้อมูลไม่ถูกต้อง", details: parsed.error.flatten() });
  }

  const { id } = req.params;
  const problem = await prisma.problem.update({
    where: { problemId: id },
    data: {
      noteOwner: (parsed.data.note || "").trim(),
      status: PROBLEM_STATUS.progress,
    },
  });

  res.json({ data: mapProblem(problem) });
});

// Broker ยืนยันแก้ไขแล้ว → resolved
router.patch("/:id/resolve", authenticate(), requireRole("broker"), async (req, res) => {
  const { id } = req.params;

  const existing = await prisma.problem.findUnique({ where: { problemId: id } });
  if (!existing || String(existing.brokerId) !== String(req.user.broker_id || req.user.id)) {
    return res.status(404).json({ message: "ไม่พบปัญหา" });
  }

  const problem = await prisma.problem.update({
    where: { problemId: id },
    data: { status: PROBLEM_STATUS.resolved },
  });

  res.json({ data: mapProblem(problem) });
});

export default router;
