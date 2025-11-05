// server/src/routes/problems.routes.js
import { Router } from "express";
import { z } from "zod";
import prisma from "../config/prisma.js";
import { authenticate, requireRole } from "../middleware/auth.js";

const router = Router();

/* ----------------------- helpers ----------------------- */
// สร้างรหัส P001, P002, ...
async function nextProblemId() {
  const [row] = await prisma.$queryRawUnsafe(
    `SELECT COALESCE(MAX(CAST(SUBSTRING(problem_id,2) AS UNSIGNED)),0) AS maxnum
       FROM problem
      WHERE problem_id REGEXP '^P[0-9]+'`
  );
  const n = Number(row?.maxnum || 0) + 1;
  return `P${String(n).padStart(3, "0")}`;
}
// ตัด prefix [รายต้น]/[ภาพรวม] ออกจากรายละเอียด ถ้ามี
function stripTypePrefix(desc = "") {
  return String(desc).replace(/^\[(รายต้น|ทั้งสวน|ภาพรวม)\]\s*/u, "");
}

/* ----------------------- GET /problems ----------------------- */
// คืนรายการปัญหา (ถ้าเป็น broker ให้เห็นเฉพาะของตัวเอง)
router.get("/", authenticate(), async (req, res) => {
  const where = [];
  const params = [];

  if (req.user.role === "broker") {
    where.push("broker_id = ?");
    params.push(String(req.user.broker_id ?? req.user.id));
  }

  const sql =
    `SELECT problem_id, tree_id, broker_id, owner_id, type, note_broker, note_owner, status
       FROM problem ` +
    (where.length ? `WHERE ${where.join(" AND ")} ` : "") +
    `ORDER BY CAST(SUBSTRING(problem_id,2) AS UNSIGNED) DESC`;

  const rows = await prisma.$queryRawUnsafe(sql, ...params);

  // map ให้อยู่ในรูปที่ FE ใช้
  const data = rows.map(r => ({
    id: r.problem_id,
    tree_id: r.tree_id,
    broker_id: r.broker_id,
    owner_id: r.owner_id,
    type: r.type, // "รายต้น" | "ภาพรวม"
    description: r.note_broker ?? "",      // รายละเอียดจาก broker
    note_owner: r.note_owner ?? "",        // แนวทางแก้ของ owner
    status: r.status,                      // "รอพบปัญหา"|"รอการแก้ไข"|"แก้ไขแล้ว"
    created_at: null,
    updated_at: null,
  }));

  res.json({ data });
});

/* ----------------------- POST /problems ----------------------- */
// รองรับการส่งมาได้ทั้งรูปแบบ:
// 1) { type: "รายต้น"|"ภาพรวม", tree_id?, note_broker }
// 2) { description: "ข้อความ", type?, tree_id? }  // FE รุ่นเก่าบางหน้าใช้ description
const createSchema = z.object({
  type: z.enum(["รายต้น", "ภาพรวม"]).optional(),
  tree_id: z.string().optional().nullable(),
  note_broker: z.string().optional(),
  description: z.string().optional(),
});

router.post("/", authenticate(), requireRole("broker"), async (req, res) => {
  const parsed = createSchema.safeParse({
    type: req.body.type,
    tree_id: req.body.tree_id ?? null,
    note_broker: req.body.note_broker ?? req.body.note ?? null,
    description: req.body.description ?? null,
  });
  if (!parsed.success) {
    return res.status(400).json({ message: "รูปแบบข้อมูลไม่ถูกต้อง" });
  }

  // รายละเอียดต้องไม่ว่าง
  const detail = (parsed.data.note_broker ?? "").trim()
    || stripTypePrefix(parsed.data.description ?? "").trim();
  if (!detail) {
    return res.status(400).json({ message: "กรุณากรอกรายละเอียดปัญหา" });
  }

  // ประเภทปัญหา (ค่าเริ่มต้นให้เป็น "ภาพรวม" ถ้าไม่ระบุ)
  const type = parsed.data.type || "ภาพรวม";

  // tree_id ใน schema ปัจจุบัน NOT NULL → ถ้าเป็นภาพรวมแล้วไม่ได้ส่งมา ให้ fallback เป็น -
  const treeId =
    type === "รายต้น"
      ? (parsed.data.tree_id || "").trim()
      : "-";

  if (!treeId.trim()) {
    return res.status(400).json({ message: "กรุณาเลือกต้นทุเรียน" });
  }

  const pid = await nextProblemId();
  const brokerId = String(req.user.broker_id ?? req.user.id);

  // สถานะเริ่มต้นในระบบนี้ใช้ "รอพบปัญหา"
  await prisma.$executeRawUnsafe(
    `INSERT INTO problem (problem_id, tree_id, broker_id, owner_id, type, note_broker, status)
     VALUES (?, ?, ?, 1, ?, ?, 'รอพบปัญหา')`,
    pid, treeId, brokerId, type, detail
  );

  const [row] = await prisma.$queryRawUnsafe(
    `SELECT problem_id, tree_id, broker_id, owner_id, type, note_broker, note_owner, status
       FROM problem
      WHERE problem_id = ?`,
    pid
  );

  res.status(201).json({
    data: {
      id: row.problem_id,
      tree_id: row.tree_id,
      broker_id: row.broker_id,
      owner_id: row.owner_id,
      type: row.type,
      description: row.note_broker ?? "",
      note_owner: row.note_owner ?? "",
      status: row.status,
      created_at: null,
      updated_at: null,
    },
  });
});

/* -------- Owner มอบหมาย/ใส่โน้ต → สถานะ "รอการแก้ไข" -------- */
router.patch("/:id/assign", authenticate(), requireRole("owner"), async (req, res) => {
  const note = String(req.body?.note ?? "").trim();

  await prisma.$executeRawUnsafe(
    `UPDATE problem SET note_owner = ?, status = 'รอการแก้ไข' WHERE problem_id = ?`,
    note || null, req.params.id
  );

  const [row] = await prisma.$queryRawUnsafe(
    `SELECT problem_id, tree_id, broker_id, owner_id, type, note_broker, note_owner, status
       FROM problem WHERE problem_id = ?`,
    req.params.id
  );

  if (!row) return res.status(404).json({ message: "ไม่พบปัญหา" });

  res.json({
    data: {
      id: row.problem_id,
      tree_id: row.tree_id,
      broker_id: row.broker_id,
      owner_id: row.owner_id,
      type: row.type,
      description: row.note_broker ?? "",
      note_owner: row.note_owner ?? "",
      status: row.status,
    },
  });
});

/* -------- Broker ยืนยันแก้ไขแล้ว → สถานะ "แก้ไขแล้ว" -------- */
router.patch("/:id/resolve", authenticate(), requireRole("broker"), async (req, res) => {
  const brokerId = String(req.user.broker_id ?? req.user.id);

  // อนุญาตเฉพาะเจ้าของปัญหา (broker เดียวกัน)
  const [own] = await prisma.$queryRawUnsafe(
    `SELECT problem_id FROM problem WHERE problem_id = ? AND broker_id = ?`,
    req.params.id, brokerId
  );
  if (!own) return res.status(404).json({ message: "ไม่พบปัญหา" });

  await prisma.$executeRawUnsafe(
    `UPDATE problem SET status = 'แก้ไขแล้ว' WHERE problem_id = ?`,
    req.params.id
  );

  const [row] = await prisma.$queryRawUnsafe(
    `SELECT problem_id, tree_id, broker_id, owner_id, type, note_broker, note_owner, status
       FROM problem WHERE problem_id = ?`,
    req.params.id
  );

  res.json({
    data: {
      id: row.problem_id,
      tree_id: row.tree_id,
      broker_id: row.broker_id,
      owner_id: row.owner_id,
      type: row.type,
      description: row.note_broker ?? "",
      note_owner: row.note_owner ?? "",
      status: row.status,
    },
  });
});

export default router;
