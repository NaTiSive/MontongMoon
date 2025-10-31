import { Router } from "express";
import { z } from "zod";
import prisma from "../config/prisma.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { mapTransaction } from "../utils/formatters.js";

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

  const transactions = await prisma.accountTransaction.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  res.json({ data: transactions.map(mapTransaction) });
});

const createSchema = z.object({
  type: z.enum(["รายรับ", "รายจ่าย"]),
  amount: z.number().positive(),
  payment_method: z.enum(["เงินสด", "โอนเงิน", "ผ่อนชำระ"]),
  note: z.string().optional(),
  receipt: z
    .object({
      name: z.string(),
      mime: z.string(),
      dataUrl: z.string(),
    })
    .optional(),
});

router.post("/", authenticate(), requireRole("broker", "owner"), async (req, res) => {
  const parsed = createSchema.safeParse({
    type: req.body.type,
    amount: Number(req.body.amount),
    payment_method: req.body.payment_method,
    note: req.body.note,
    receipt: req.body.receipt,
  });
  if (!parsed.success) {
    return res.status(400).json({ message: "ข้อมูลไม่ถูกต้อง", details: parsed.error.flatten() });
  }

  const { type, amount, payment_method, note, receipt } = parsed.data;
  const brokerId = req.user.role === "broker" ? req.user.id : req.body.broker_id ?? null;

  const tx = await prisma.accountTransaction.create({
    data: {
      brokerId: brokerId != null ? Number(brokerId) : null,
      type,
      amount,
      paymentMethod: payment_method,
      note: note || "",
      receiptName: receipt?.name ?? null,
      receiptMime: receipt?.mime ?? null,
      receiptDataUrl: receipt?.dataUrl ?? null,
      status: "รอการตรวจสอบ",
    },
  });

  res.status(201).json({ data: mapTransaction(tx) });
});

router.patch("/:id/approve", authenticate(), requireRole("owner"), async (req, res) => {
  const { id } = req.params;
  const tx = await prisma.accountTransaction.update({
    where: { id },
    data: { status: "อนุมัติ", updatedAt: new Date() },
  });
  res.json({ data: mapTransaction(tx) });
});

router.patch("/:id/reject", authenticate(), requireRole("owner"), async (req, res) => {
  const { id } = req.params;
  const tx = await prisma.accountTransaction.update({
    where: { id },
    data: { status: "ปฏิเสธ", updatedAt: new Date() },
  });
  res.json({ data: mapTransaction(tx) });
});

router.get("/summary/all", authenticate(), requireRole("owner"), async (req, res) => {
  const transactions = await prisma.accountTransaction.findMany();
  const summary = {
    total: transactions.length,
    byStatus: {},
    incomeApproved: 0,
    expenseApproved: 0,
  };

  transactions.forEach((tx) => {
    const mapped = mapTransaction(tx);
    summary.byStatus[mapped.status] = (summary.byStatus[mapped.status] || 0) + 1;
    if (mapped.status === "อนุมัติ") {
      if (mapped.type === "รายรับ") summary.incomeApproved += mapped.amount;
      if (mapped.type === "รายจ่าย") summary.expenseApproved += mapped.amount;
    }
  });

  res.json({ data: summary });
});

export default router;
