import { Router } from "express";
import { z } from "zod";
import prisma from "../config/prisma.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { mapProblem } from "../utils/formatters.js";

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
  const where = {};
  if (req.user.role === "broker") {
    where.brokerId = req.user.id;
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

  const problem = await prisma.problem.create({
    data: {
      problemId: await generateProblemId(),
      brokerId: req.user.id,
      ownerId: 1,
      treeId: parsed.data.tree_id || "T-001",
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
