import { Router } from "express";
import { z } from "zod";
import prisma from "../config/prisma.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { mapTree } from "../utils/formatters.js";

const router = Router();

router.get("/", authenticate(), async (req, res) => {
  const trees = await prisma.tree.findMany({ orderBy: { id: "asc" } });
  res.json({ data: trees.map(mapTree) });
});

const updateSchema = z.object({ status: z.string().min(1) });

router.patch("/:id/status", authenticate(), requireRole("owner"), async (req, res) => {
  const parsed = updateSchema.safeParse({ status: req.body.status });
  if (!parsed.success) {
    return res.status(400).json({ message: "ข้อมูลไม่ถูกต้อง", details: parsed.error.flatten() });
  }
  const { id } = req.params;
  const tree = await prisma.tree.update({
    where: { id },
    data: { status: parsed.data.status },
  });
  res.json({ data: mapTree(tree) });
});

export default router;
