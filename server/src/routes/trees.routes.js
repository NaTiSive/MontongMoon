import { Router } from "express";
import { z } from "zod";
import prisma from "../config/prisma.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { mapTree } from "../utils/formatters.js";
import { sumHarvestByGrade } from "../utils/fruits.js";

const router = Router();

const TREE_STATUS_INPUT = {
  "ปกติ": "normal",
  "ออกดอก": "flowering",
  "ออกผล": "fruiting",
};

router.get("/", authenticate(), async (req, res) => {
  const { broker_id: brokerIdParam } = req.query;
  const where = {};
  if (req.user.role === "broker") {
    where.brokerId = req.user.id;
  }
  if (brokerIdParam) {
    where.brokerId = String(brokerIdParam);
  }
  const trees = await prisma.durianTree.findMany({ where, orderBy: { treeId: "asc" } });
  res.json({ data: trees.map(mapTree) });
});

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

  // เดิมล็อก ownerId: 1 -> ทำให้ broker ได้ 0 เสมอ
  const ownerId = req.user.role === "owner" ? req.user.id : null;
  const summary = await sumHarvestByGrade({ ownerId, brokerId, treeId, start: startDate, end: endDate });
  res.json({ summary });
});

const updateSchema = z.object({ status: z.enum(["ปกติ", "ออกดอก", "ออกผล"]) });

router.patch("/:id/status", authenticate(), requireRole("owner"), async (req, res) => {
  const parsed = updateSchema.safeParse({ status: req.body.status });
  if (!parsed.success) {
    return res.status(400).json({ message: "ข้อมูลไม่ถูกต้อง", details: parsed.error.flatten() });
  }
  const { id } = req.params;
  const tree = await prisma.durianTree.update({
    where: { treeId: id },
    data: { status: TREE_STATUS_INPUT[parsed.data.status] },
  });
  res.json({ data: mapTree(tree) });
});

export default router;
