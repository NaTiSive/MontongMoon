import { Router } from "express";
import { z } from "zod";
import prisma from "../config/prisma.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { mapProblem } from "../utils/formatters.js";

const router = Router();

router.get("/", authenticate(), async (req, res) => {
  const where = {};
  if (req.user.role === "broker") {
    where.brokerId = req.user.id;
  }

  const problems = await prisma.problem.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  res.json({ data: problems.map(mapProblem) });
});

const createSchema = z.object({
  tree_id: z.string().optional(),
  type: z.string().min(1),
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
      brokerId: req.user.id,
      treeId: parsed.data.tree_id || null,
      type: parsed.data.type,
      noteBroker: parsed.data.note_broker || "",
      status: "เปิดปัญหา",
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
    where: { id },
    data: {
      ownerNote: parsed.data.note,
      status: "ระหว่างแก้ไข",
      updatedAt: new Date(),
    },
  });

  res.json({ data: mapProblem(problem) });
});

router.patch("/:id/resolve", authenticate(), requireRole("broker"), async (req, res) => {
  const { id } = req.params;

  const existing = await prisma.problem.findUnique({ where: { id } });
  if (!existing || existing.brokerId !== req.user.id) {
    return res.status(404).json({ message: "ไม่พบปัญหา" });
  }

  const problem = await prisma.problem.update({
    where: { id },
    data: { status: "แก้ไขแล้ว", updatedAt: new Date() },
  });

  res.json({ data: mapProblem(problem) });
});

export default router;
