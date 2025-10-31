import { Router } from "express";
import { z } from "zod";
import prisma from "../config/prisma.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { mapContract } from "../utils/formatters.js";

const router = Router();

router.get("/deadline", authenticate(), async (req, res) => {
  const setting = await prisma.ownerSetting.findUnique({ where: { id: 1 } });
  if (!setting) {
    return res.status(404).json({ message: "ยังไม่ตั้งค่ากำหนดส่ง" });
  }
  res.json({ current_deadline_date: setting.submissionDeadline.toISOString() });
});

const deadlineSchema = z.object({ deadline: z.string().datetime() });

router.put("/deadline", authenticate(), requireRole("owner"), async (req, res) => {
  const parsed = deadlineSchema.safeParse({ deadline: req.body.deadline || req.body.current_deadline_date });
  if (!parsed.success) {
    return res.status(400).json({ message: "รูปแบบวันที่ไม่ถูกต้อง", details: parsed.error.flatten() });
  }
  const dt = new Date(parsed.data.deadline);
  const setting = await prisma.ownerSetting.upsert({
    where: { id: 1 },
    update: { submissionDeadline: dt },
    create: { id: 1, submissionDeadline: dt },
  });
  res.json({ current_deadline_date: setting.submissionDeadline.toISOString() });
});

router.get("/submission-context", authenticate(), async (req, res) => {
  const totalTrees = await prisma.tree.count();
  const problemsOpen = await prisma.problem.count({ where: { NOT: { status: "แก้ไขแล้ว" } } });
  const byStatusRaw = await prisma.tree.groupBy({ by: ["status"], _count: true });
  const byStatus = byStatusRaw.map((row) => ({ status: row.status, count: row._count }));
  res.json({ totalTrees, problemsOpen, byStatus });
});

const createSchema = z.object({
  qtt_estimate: z.number().positive(),
  offerprice_by_grade: z.object({
    A: z.number().positive(),
    B: z.number().positive(),
    C: z.number().positive(),
  }),
  payment_term: z.string().optional(),
  note: z.string().optional(),
});

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

  const owner = await prisma.user.findFirst({ where: { role: "owner" } });
  if (!owner) return res.status(500).json({ message: "ยังไม่ได้สร้างบัญชีเจ้าของสวน" });

  const contract = await prisma.contract.create({
    data: {
      brokerId: req.user.id,
      ownerId: owner.id,
      qtyEstimate: parsed.data.qtt_estimate,
      priceGradeA: parsed.data.offerprice_by_grade.A,
      priceGradeB: parsed.data.offerprice_by_grade.B,
      priceGradeC: parsed.data.offerprice_by_grade.C,
      paymentTerm: parsed.data.payment_term || "",
      note: parsed.data.note || "",
      status: "รอการพิจารณา",
    },
  });

  res.status(201).json({ data: mapContract(contract) });
});

router.get("/", authenticate(), async (req, res) => {
  const { broker_id: brokerIdParam } = req.query;
  const where = {};
  if (req.user.role === "broker") {
    where.brokerId = req.user.id;
  }
  if (brokerIdParam) {
    where.brokerId = Number(brokerIdParam);
  }

  const contracts = await prisma.contract.findMany({ orderBy: { contractDate: "desc" }, where });
  res.json({ data: contracts.map(mapContract) });
});

router.post("/:id/approve", authenticate(), requireRole("owner"), async (req, res) => {
  const { id } = req.params;

  const contract = await prisma.contract.findUnique({ where: { id } });
  if (!contract) return res.status(404).json({ message: "ไม่พบข้อเสนอ" });

  await prisma.$transaction(async (tx) => {
    await tx.contract.updateMany({
      where: { status: "ยอมรับ", id: { not: id } },
      data: { status: "รอการพิจารณา" },
    });

    await tx.contract.update({ where: { id }, data: { status: "ยอมรับ" } });
    await tx.user.update({ where: { id: contract.brokerId }, data: { approvalStatus: "approved" } });
  });

  const updated = await prisma.contract.findUnique({ where: { id } });
  res.json({ data: mapContract(updated) });
});

router.post("/:id/reject", authenticate(), requireRole("owner"), async (req, res) => {
  const { id } = req.params;
  const contract = await prisma.contract.update({ where: { id }, data: { status: "ปฏิเสธ" } });
  res.json({ data: mapContract(contract) });
});

router.get("/approvals/:brokerId", authenticate(), async (req, res) => {
  const brokerId = Number(req.params.brokerId);
  if (Number.isNaN(brokerId)) return res.status(400).json({ message: "broker_id ไม่ถูกต้อง" });
  const broker = await prisma.user.findUnique({ where: { id: brokerId, role: "broker" } });
  if (!broker) return res.status(404).json({ message: "ไม่พบบัญชีผู้รับเหมา" });
  res.json({ broker_id: brokerId, approvalStatus: broker.approvalStatus });
});

const approvalSchema = z.object({ status: z.enum(["pending", "approved", "rejected"]) });

router.patch("/approvals/:brokerId", authenticate(), requireRole("owner"), async (req, res) => {
  const brokerId = Number(req.params.brokerId);
  if (Number.isNaN(brokerId)) return res.status(400).json({ message: "broker_id ไม่ถูกต้อง" });
  const parsed = approvalSchema.safeParse({ status: req.body.status || req.body.approvalStatus });
  if (!parsed.success) {
    return res.status(400).json({ message: "ข้อมูลไม่ถูกต้อง", details: parsed.error.flatten() });
  }
  const broker = await prisma.user.update({ where: { id: brokerId, role: "broker" }, data: { approvalStatus: parsed.data.status } });
  res.json({ broker_id: brokerId, approvalStatus: broker.approvalStatus });
});

router.get("/has-active-offer", authenticate(), async (req, res) => {
  res.json({ hasActive: false });
});

export default router;
