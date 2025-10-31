import { Router } from "express";
import { z } from "zod";
import prisma from "../config/prisma.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { mapActivity } from "../utils/formatters.js";

const router = Router();

router.get("/", authenticate(), async (req, res) => {
  const { broker_id: brokerIdParam } = req.query;
  const where = {};

  if (req.user.role === "broker") {
    where.brokerId = req.user.id;
  }

  if (brokerIdParam) {
    where.brokerId = Number(brokerIdParam);
  }

  const activities = await prisma.activity.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  res.json({ data: activities.map(mapActivity) });
});

const createSchema = z.object({
  tree_id: z.string().min(1),
  type: z.string().min(1),
  note: z.string().optional(),
});

router.post("/", authenticate(), requireRole("broker"), async (req, res) => {
  const parsed = createSchema.safeParse({
    tree_id: req.body.tree_id,
    type: req.body.type,
    note: req.body.note,
  });
  if (!parsed.success) {
    return res.status(400).json({ message: "ข้อมูลไม่ถูกต้อง", details: parsed.error.flatten() });
  }

  const activity = await prisma.activity.create({
    data: {
      brokerId: req.user.id,
      treeId: parsed.data.tree_id,
      type: parsed.data.type,
      note: parsed.data.note || "",
    },
  });

  res.status(201).json({ data: mapActivity(activity) });
});

export default router;
