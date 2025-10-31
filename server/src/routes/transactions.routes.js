import { Router } from "express";
import { z } from "zod";
import prisma from "../config/prisma.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { mapTransaction } from "../utils/formatters.js";

const router = Router();

const PAYMENT_METHOD_INPUT = {
  "เงินสด": "cash",
  "โอนเงิน": "bankTransfer",
  "บัตรเครดิต": "creditCard",
  "อื่นๆ": "other",
};

const TRANSACTION_TYPE_INPUT = {
  "รายรับ": "income",
  "รายจ่าย": "expense",
};

router.get("/", authenticate(), async (req, res) => {
  const { broker_id: brokerIdParam } = req.query;
  const where = {};

  if (req.user?.role === "broker") {
    where.brokerId = req.user.id;
  }

  if (brokerIdParam) {
    where.brokerId = String(brokerIdParam);
  }

  const transactions = await prisma.account.findMany({
    where,
    orderBy: { date: "desc" },
  });

  res.json({ data: transactions.map(mapTransaction) });
});

const createSchema = z.object({
  type: z.enum(["รายรับ", "รายจ่าย"]),
  amount: z.number().positive(),
  payment_method: z.enum(["เงินสด", "โอนเงิน", "บัตรเครดิต", "อื่นๆ"]),
  note: z.string().optional(),
  date: z.string().datetime().optional(),
});

router.post("/", authenticate(), requireRole("broker", "owner"), async (req, res) => {
  const parsed = createSchema.safeParse({
    type: req.body.type,
    amount: Number(req.body.amount),
    payment_method: req.body.payment_method,
    note: req.body.note,
    date: req.body.date,
  });
  if (!parsed.success) {
    return res.status(400).json({ message: "ข้อมูลไม่ถูกต้อง", details: parsed.error.flatten() });
  }

  const { type, amount, payment_method, note, date } = parsed.data;
  const brokerId = req.user.role === "broker" ? req.user.id : req.body.broker_id ? String(req.body.broker_id) : null;

  const tx = await prisma.account.create({
    data: {
      accountId: await generateAccountId(),
      ownerId: 1,
      brokerId,
      type: TRANSACTION_TYPE_INPUT[type],
      amount,
      paymentMethod: PAYMENT_METHOD_INPUT[payment_method],
      note: note || "",
      invoiceRef: req.body.invoice_ref || null,
      status: "pending",
      date: date ? new Date(date) : new Date(),
    },
  });

  res.status(201).json({ data: mapTransaction(tx) });
});

router.patch("/:id/approve", authenticate(), requireRole("owner"), async (req, res) => {
  const { id } = req.params;
  const tx = await prisma.account.update({
    where: { accountId: id },
    data: { status: "approved" },
  });
  res.json({ data: mapTransaction(tx) });
});

router.patch("/:id/reject", authenticate(), requireRole("owner"), async (req, res) => {
  const { id } = req.params;
  const tx = await prisma.account.update({
    where: { accountId: id },
    data: { status: "rejected" },
  });
  res.json({ data: mapTransaction(tx) });
});

router.get("/summary/all", authenticate(), requireRole("owner"), async (req, res) => {
  const transactions = await prisma.account.findMany();
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

async function generateAccountId() {
  const last = await prisma.account.findMany({ orderBy: { accountId: "desc" }, take: 1 });
  if (!last.length) {
    return "AC001";
  }
  const current = last[0].accountId;
  const numeric = parseInt(current.replace(/^AC/, ""), 10) || 0;
  const next = numeric + 1;
  return `AC${next.toString().padStart(3, "0")}`;
}

export default router;
