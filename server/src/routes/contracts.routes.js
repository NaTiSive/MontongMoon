import { Router } from "express";
import { z } from "zod";
import prisma from "../config/prisma.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { mapContract } from "../utils/formatters.js";
import { getBrokerApprovalStatus, resolveOwnerIdForRequest } from "../utils/brokers.js";

const router = Router();

router.get("/deadline", authenticate(), async (req, res) => {
  const ownerId = await resolveOwnerIdForRequest(req.user, req.query.owner_id);
  let owner = null;
  if (ownerId !== null) {
    owner = await prisma.owner.findUnique({ where: { ownerId } });
  } else {
    owner = await prisma.owner.findFirst({ orderBy: { ownerId: "asc" } });
  }
  if (!owner || !owner.currentDeadlineDate) {
    return res.status(404).json({ message: "ยังไม่ตั้งค่ากำหนดส่ง" });
  }
  res.json({ current_deadline_date: owner.currentDeadlineDate.toISOString() });
});

const deadlineSchema = z.object({ deadline: z.string().datetime() });

router.put("/deadline", authenticate(), requireRole("owner"), async (req, res) => {
  const parsed = deadlineSchema.safeParse({ deadline: req.body.deadline || req.body.current_deadline_date });
  if (!parsed.success) {
    return res.status(400).json({ message: "รูปแบบวันที่ไม่ถูกต้อง", details: parsed.error.flatten() });
  }
  const dt = new Date(parsed.data.deadline);
  const updated = await prisma.owner.update({
    where: { ownerId: req.user.id },
    data: {
      currentDeadlineDate: dt,
      lastModifiedDeadlineDate: new Date(),
    },
  });
  res.json({ current_deadline_date: updated.currentDeadlineDate.toISOString() });
});

const createSchema = z.object({
  qtt_estimate: z.number().positive(),
  offerprice_by_grade: z.object({
    A: z.number().positive(),
    B: z.number().positive(),
    C: z.number().positive(),
  }),
  payment_term: z.enum(["เงินสด", "โอนเงิน", "ผ่อนชำระ", "อื่นๆ"]).optional(),
  note: z.string().optional(),
});

const PAYMENT_TERM_INPUT = {
  "เงินสด": "cash",
  "โอนเงิน": "bankTransfer",
  "ผ่อนชำระ": "installment",
  "อื่นๆ": "other",
};

router.post("/", authenticate(), requireRole("broker"), async (req, res) => {
  const parsed = createSchema.safeParse({
    qtt_estimate: Number(req.body.qtt_estimate),
    offerprice_by_grade: {
      A: Number(req.body.offerprice_by_grade?.A),
      B: Number(req.body.offerprice_by_grade?.B),
      C: Number(req.body.offerprice_by_grade?.C),
    },
    payment_term: req.body.payment_term,
    note: req.body.note,
  });
  if (!parsed.success) {
    return res.status(400).json({ message: "ข้อมูลไม่ถูกต้อง", details: parsed.error.flatten() });
  }

  let ownerId = await resolveOwnerIdForRequest(req.user, req.body.owner_id);
  if (ownerId === null) {
    const fallbackOwner = await prisma.owner.findFirst({ orderBy: { ownerId: "asc" } });
    ownerId = fallbackOwner?.ownerId ?? null;
  }
  if (ownerId === null) return res.status(500).json({ message: "ยังไม่ได้สร้างบัญชีเจ้าของสวน" });

  const contractId = await generateContractId();
  const offerprice = `${parsed.data.offerprice_by_grade.A},${parsed.data.offerprice_by_grade.B},${parsed.data.offerprice_by_grade.C}`;

  const contract = await prisma.contract.create({
    data: {
      contractId,
      brokerId: req.user.id,
      ownerId,
      qtyEstimate: parsed.data.qtt_estimate,
      paymentTerm: parsed.data.payment_term ? PAYMENT_TERM_INPUT[parsed.data.payment_term] : "bankTransfer",
      note: parsed.data.note || "",
      status: "pending",
      contractDate: new Date(),
      offerprice,
      prices: {
        create: [
          { grade: "A", price: parsed.data.offerprice_by_grade.A },
          { grade: "B", price: parsed.data.offerprice_by_grade.B },
          { grade: "C", price: parsed.data.offerprice_by_grade.C },
        ],
      },
    },
    include: { prices: true },
  });

  res.status(201).json({ data: mapContract(contract) });
});

router.get("/", authenticate(), async (req, res) => {
  const { broker_id: brokerIdParam, owner_id: ownerIdParam } = req.query;
  const where = {};
  if (req.user.role === "broker") {
    where.brokerId = req.user.id;
  }
  if (brokerIdParam) {
    where.brokerId = String(brokerIdParam);
  }
  const ownerId = await resolveOwnerIdForRequest(req.user, ownerIdParam);
  if (ownerId !== null) {
    where.ownerId = ownerId;
  }

  const contracts = await prisma.contract.findMany({
    orderBy: { contractDate: "desc" },
    where,
    include: { prices: true },
  });
  res.json({ data: contracts.map(mapContract) });
});

router.post("/:id/approve", authenticate(), requireRole("owner"), async (req, res) => {
  const { id } = req.params;

  const contract = await prisma.contract.findUnique({ where: { contractId: id }, include: { prices: true } });
  if (!contract) return res.status(404).json({ message: "ไม่พบข้อเสนอ" });

  await prisma.$transaction(async (tx) => {
    await tx.contract.updateMany({
      where: { status: "accepted", contractId: { not: id } },
      data: { status: "pending" },
    });

    await tx.contract.update({ where: { contractId: id }, data: { status: "accepted" } });
  });

  const updated = await prisma.contract.findUnique({ where: { contractId: id }, include: { prices: true } });
  res.json({ data: mapContract(updated) });
});

router.post("/:id/reject", authenticate(), requireRole("owner"), async (req, res) => {
  const { id } = req.params;
  const contract = await prisma.contract.update({
    where: { contractId: id },
    data: { status: "rejected" },
    include: { prices: true },
  });
  res.json({ data: mapContract(contract) });
});

router.get("/approvals/:brokerId", authenticate(), async (req, res) => {
  const brokerId = String(req.params.brokerId);
  const broker = await prisma.broker.findUnique({ where: { brokerId } });
  if (!broker) return res.status(404).json({ message: "ไม่พบบัญชีผู้รับเหมา" });
  const status = await getBrokerApprovalStatus(brokerId);
  res.json({ broker_id: brokerId, approvalStatus: status });
});

router.get("/has-active-offer", authenticate(), async (req, res) => {
  const { broker_id: brokerIdParam } = req.query;
  const filters = { status: "accepted" };

  if (brokerIdParam) {
    filters.brokerId = String(brokerIdParam);
  } else if (req.user.role === "broker") {
    filters.brokerId = req.user.id;
  }

  const contract = await prisma.contract.findFirst({
    where: filters,
    orderBy: { contractDate: "desc" },
    include: { prices: true },
  });

  res.json({ hasActive: Boolean(contract), contract: mapContract(contract) });
});

async function generateContractId() {
  const last = await prisma.contract.findMany({ orderBy: { contractId: "desc" }, take: 1 });
  if (!last.length) return "C001";
  const current = last[0].contractId;
  const numeric = parseInt(current.replace(/^C/, ""), 10) || 0;
  const next = numeric + 1;
  return `C${next.toString().padStart(3, "0")}`;
}

export default router;
