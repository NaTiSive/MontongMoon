import { Router } from "express";
import { z } from "zod";
import prisma from "../config/prisma.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { mapProblem } from "../utils/formatters.js";
import { resolveOwnerIdForRequest } from "../utils/brokers.js";

const router = Router();

const PROBLEM_SCOPE_INPUT = {
  "รายต้น": "tree",
  "ภาพรวม": "overview",
};

const PROBLEM_STATUS = {
  open: "pending",
  progress: "inProgress",
  resolved: "resolved",
};

router.get("/", authenticate(), async (req, res) => {
  const { owner_id: ownerIdParam } = req.query;
  const where = {};
  if (req.user.role === "broker") {
    where.brokerId = req.user.id;
  }

  const ownerId = await resolveOwnerIdForRequest(req.user, ownerIdParam);
  if (ownerId !== null) {
    where.ownerId = ownerId;
  }

  const problems = await prisma.problem.findMany({
    where,
    orderBy: { problemId: "desc" },
  });

  res.json({ data: problems.map(mapProblem) });
});

const createSchema = z.object({
  tree_id: z.string().optional(),
  type: z.enum(["รายต้น", "ภาพรวม"]),
  note_broker: z.string().optional(),
});

router.post("/", authenticate(), requireRole("broker"), async (req, res) => {
  const parsed = createSchema.safeParse({
    tree_id: req.body.tree_id,
    type: req.body.type,
    note_broker: req.body.note_broker,
  });
  if (!parsed.success) {
    return res.status(400).json({ message: "ข้อมูลไม่ถูกต้อง", details: parsed.error.flatten() });
  }

  let treeId = parsed.data.tree_id ? String(parsed.data.tree_id) : null;
  let ownerId = null;

  if (treeId) {
    const tree = await prisma.durianTree.findUnique({
      where: { treeId },
      select: { ownerId: true, brokerId: true, treeId: true },
    });
    if (!tree) {
      return res.status(404).json({ message: "ไม่พบต้นทุเรียนที่ระบุ" });
    }
    if (req.user.role === "broker" && tree.brokerId && tree.brokerId !== req.user.id) {
      return res.status(403).json({ message: "ไม่สามารถรายงานปัญหาต้นนี้ได้" });
    }
    ownerId = Number(tree.ownerId);
    treeId = tree.treeId;
  } else {
    ownerId = await resolveOwnerIdForRequest(req.user);
    const fallbackTree = await prisma.durianTree.findFirst({
      where: ownerId !== null ? { ownerId } : undefined,
      orderBy: { treeId: "asc" },
      select: { treeId: true, ownerId: true, brokerId: true },
    });
    if (!fallbackTree) {
      return res.status(400).json({ message: "กรุณาระบุต้นทุเรียนที่ต้องการรายงาน" });
    }
    treeId = fallbackTree.treeId;
    ownerId = Number(fallbackTree.ownerId);
  }

  const problem = await prisma.problem.create({
    data: {
      problemId: await generateProblemId(),
      brokerId: req.user.id,
      ownerId,
      treeId,
      type: PROBLEM_SCOPE_INPUT[parsed.data.type],
      noteBroker: parsed.data.note_broker || "",
      status: PROBLEM_STATUS.open,
    },
  });

  res.status(201).json({ data: mapProblem(problem) });
});

const assignSchema = z.object({
  note: z.string().min(1),
});

router.patch("/:id/assign", authenticate(), requireRole("owner"), async (req, res) => {
  const parsed = assignSchema.safeParse({ note: req.body.note });
  if (!parsed.success) {
    return res.status(400).json({ message: "ข้อมูลไม่ถูกต้อง", details: parsed.error.flatten() });
  }

  const { id } = req.params;
  const problem = await prisma.problem.update({
    where: { problemId: id },
    data: {
      noteOwner: parsed.data.note,
      status: PROBLEM_STATUS.progress,
    },
  });

  res.json({ data: mapProblem(problem) });
});

router.patch("/:id/resolve", authenticate(), requireRole("broker"), async (req, res) => {
  const { id } = req.params;

  const existing = await prisma.problem.findUnique({ where: { problemId: id } });
  if (!existing || existing.brokerId !== req.user.id) {
    return res.status(404).json({ message: "ไม่พบปัญหา" });
  }

  const problem = await prisma.problem.update({
    where: { problemId: id },
    data: { status: PROBLEM_STATUS.resolved },
  });

  res.json({ data: mapProblem(problem) });
});

async function generateProblemId() {
  const last = await prisma.problem.findMany({ orderBy: { problemId: "desc" }, take: 1 });
  if (!last.length) return "P001";
  const current = last[0].problemId;
  const numeric = parseInt(current.replace(/^P/, ""), 10) || 0;
  const next = numeric + 1;
  return `P${next.toString().padStart(3, "0")}`;
}

export default router;
