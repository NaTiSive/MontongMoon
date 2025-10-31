// server/src/modules/contracts/contracts.controller.js
import { prisma } from "../../prisma.js";

// แปลงสถานะ EN → TH ให้ UI เดิมใช้ได้เลย
function statusToTH(s) {
  return s === "PENDING"  ? "รอการพิจารณา"
       : s === "ACCEPTED" ? "ยอมรับ"
       : s === "REJECTED" ? "ปฏิเสธ"
       : s;
}

// shape สำหรับตอบกลับให้ตรงกับ frontend adapters
function toResponse(c) {
  return {
    id: c.id,
    brokerId: c.brokerId,
    qtyEstimateKg: c.qtyEstimateKg,
    priceByGrade: c.priceByGrade || { A: 0, B: 0, C: 0 },
    paymentTerm: c.paymentTerm,
    note: c.note || "",
    status: statusToTH(c.status),
    createdAt: c.createdAt,
    contractDate: c.contractDate || null,
  };
}

// GET /contracts?brokerId=...&status=...
export async function listContracts(req, res) {
  try {
    const { brokerId, status } = req.query;

    const where = {};
    if (brokerId) where.brokerId = String(brokerId);
    if (status) {
      // อนุญาตทั้ง EN/TH
      const map =
        status === "รอการพิจารณา" ? "PENDING" :
        status === "ยอมรับ"        ? "ACCEPTED" :
        status === "ปฏิเสธ"        ? "REJECTED" : status;
      where.status = map;
    }

    const rows = await prisma.contract.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    res.json(rows.map(toResponse));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

// POST /contracts  (broker)
export async function createContract(req, res) {
  try {
    const { brokerId, qtyEstimateKg, priceByGrade, paymentTerm, note } = req.body;

    if (!brokerId)   return res.status(400).json({ error: "missing brokerId" });
    if (!qtyEstimateKg || qtyEstimateKg <= 0)
      return res.status(400).json({ error: "invalid qtyEstimateKg" });
    if (!priceByGrade || typeof priceByGrade !== "object")
      return res.status(400).json({ error: "invalid priceByGrade" });
    if (!paymentTerm) return res.status(400).json({ error: "missing paymentTerm" });

    // ตรวจสอบว่า broker มีจริง
    const broker = await prisma.broker.findUnique({ where: { id: String(brokerId) }});
    if (!broker) return res.status(404).json({ error: "broker not found" });

    const created = await prisma.contract.create({
      data: {
        brokerId: String(brokerId),
        qtyEstimateKg: Number(qtyEstimateKg),
        priceByGrade: priceByGrade, // {A,B,C}
        paymentTerm,
        note: note || "",
        status: "PENDING",
      },
    });

    res.json(toResponse(created));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

// POST /contracts/:id/approve  (owner)
export async function approveContract(req, res) {
  try {
    const { id } = req.params;

    const c = await prisma.contract.findUnique({ where: { id } });
    if (!c) return res.status(404).json({ error: "contract not found" });
    if (c.status === "ACCEPTED") return res.json(toResponse(c));

    // นโยบาย: อนุมัติ 1 ฉบับ → ปัดข้อเสนออื่นของ broker เดียวกันที่ยัง pending เป็น REJECTED
    const now = new Date();
    const updated = await prisma.$transaction(async (tx) => {
      // ปัด pending อื่น ๆ ของ broker เดียวกันทิ้ง
      await tx.contract.updateMany({
        where: { brokerId: c.brokerId, status: "PENDING", NOT: { id } },
        data: { status: "REJECTED" },
      });
      // อนุมัติฉบับนี้
      return tx.contract.update({
        where: { id },
        data: { status: "ACCEPTED", contractDate: now },
      });
    });

    res.json(toResponse(updated));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

// POST /contracts/:id/reject  (owner)
export async function rejectContract(req, res) {
  try {
    const { id } = req.params;
    const c = await prisma.contract.findUnique({ where: { id } });
    if (!c) return res.status(404).json({ error: "contract not found" });
    if (c.status === "REJECTED") return res.json(toResponse(c));

    const updated = await prisma.contract.update({
      where: { id },
      data: { status: "REJECTED" },
    });

    res.json(toResponse(updated));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
