import { Router } from "express";
import { z } from "zod";
import prisma from "../config/prisma.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { mapExportRequest, mapFruit } from "../utils/formatters.js";

const router = Router();

async function getStockByGrade(brokerId) {
  const harvest = await prisma.fruitRecord.groupBy({
    by: ["grade"],
    _sum: { weightKg: true },
    where: {
      type: "เก็บเกี่ยว",
      ...(brokerId ? { brokerId } : {}),
    },
  });
  const exported = await prisma.fruitRecord.groupBy({
    by: ["grade"],
    _sum: { weightKg: true },
    where: {
      type: "ส่งออก",
      ...(brokerId ? { brokerId } : {}),
    },
  });
  const mapSum = (arr) => Object.fromEntries(arr.map((r) => [r.grade, Number(r._sum.weightKg || 0)]));
  const harvestMap = mapSum(harvest);
  const exportMap = mapSum(exported);
  return {
    A: Math.max(0, (harvestMap.A || 0) - (exportMap.A || 0)),
    B: Math.max(0, (harvestMap.B || 0) - (exportMap.B || 0)),
    C: Math.max(0, (harvestMap.C || 0) - (exportMap.C || 0)),
  };
}

router.get("/stock", authenticate(), async (req, res) => {
  const brokerId = req.query.broker_id ? Number(req.query.broker_id) : null;
  const stock = await getStockByGrade(brokerId ?? (req.user.role === "broker" ? req.user.id : null));
  res.json({ stock });
});

const submitSchema = z.object({
  grades: z.object({
    A: z.number().nonnegative(),
    B: z.number().nonnegative(),
    C: z.number().nonnegative(),
  }),
});

router.post("/requests", authenticate(), requireRole("broker"), async (req, res) => {
  const parsed = submitSchema.safeParse({
    grades: {
      A: Number(req.body.grades?.A || 0),
      B: Number(req.body.grades?.B || 0),
      C: Number(req.body.grades?.C || 0),
    },
  });
  if (!parsed.success) {
    return res.status(400).json({ message: "ข้อมูลไม่ถูกต้อง", details: parsed.error.flatten() });
  }

  const { grades } = parsed.data;
  if ([grades.A, grades.B, grades.C].every((v) => v <= 0)) {
    return res.status(400).json({ message: "น้ำหนักอย่างน้อยหนึ่งเกรดต้องมากกว่า 0" });
  }

  const stock = await getStockByGrade(req.user.id);
  if (grades.A > stock.A || grades.B > stock.B || grades.C > stock.C) {
    return res.status(400).json({ message: "น้ำหนักบางเกรดเกินกว่าสต็อกพร้อมส่งออก" });
  }

  const request = await prisma.exportRequest.create({
    data: {
      brokerId: req.user.id,
      gradeA: grades.A,
      gradeB: grades.B,
      gradeC: grades.C,
      status: "รอการยืนยันจากเจ้าของสวน",
    },
  });

  res.status(201).json({ data: mapExportRequest(request) });
});

router.get("/requests", authenticate(), async (req, res) => {
  const { broker_id: brokerIdParam } = req.query;
  const where = {};
  if (req.user.role === "broker") {
    where.brokerId = req.user.id;
  }
  if (brokerIdParam) {
    where.brokerId = Number(brokerIdParam);
  }
  const requests = await prisma.exportRequest.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
  res.json({ data: requests.map(mapExportRequest) });
});

router.post("/requests/:id/withdraw", authenticate(), requireRole("broker"), async (req, res) => {
  const { id } = req.params;
  const request = await prisma.exportRequest.findUnique({ where: { id } });
  if (!request || request.brokerId !== req.user.id) {
    return res.status(404).json({ message: "ไม่พบคำขอ" });
  }
  if (request.status !== "รอการยืนยันจากเจ้าของสวน") {
    return res.status(400).json({ message: "ยกเลิกได้เฉพาะคำขอที่ยังรอการยืนยันเท่านั้น" });
  }
  const updated = await prisma.exportRequest.update({
    where: { id },
    data: { status: "ผู้รับเหมาถอนคำขอ" },
  });
  res.json({ data: mapExportRequest(updated) });
});

async function getLatestAcceptedContract(brokerId) {
  return prisma.contract.findFirst({
    where: { brokerId, status: "ยอมรับ" },
    orderBy: { contractDate: "desc" },
  });
}

async function applyExport(tx, brokerId, grades, note) {
  const created = [];
  const now = new Date();
  for (const grade of ["A", "B", "C"]) {
    const weight = Number(grades[grade] || 0);
    if (weight > 0) {
      const record = await tx.fruitRecord.create({
        data: {
          brokerId,
          grade,
          weightKg: weight,
          type: "ส่งออก",
          note,
          harvestAt: now,
        },
      });
      created.push(record);
    }
  }

  for (const grade of ["A", "B", "C"]) {
    let remaining = Number(grades[grade] || 0);
    if (remaining <= 0) continue;
    const harvestRecords = await tx.fruitRecord.findMany({
      where: { brokerId, grade, type: "เก็บเกี่ยว" },
      orderBy: { harvestAt: "asc" },
    });

    for (const record of harvestRecords) {
      if (remaining <= 0) break;
      const weight = Number(record.weightKg);
      if (weight <= remaining + 1e-6) {
        remaining -= weight;
        await tx.fruitRecord.delete({ where: { id: record.id } });
      } else {
        await tx.fruitRecord.update({
          where: { id: record.id },
          data: { weightKg: weight - remaining },
        });
        remaining = 0;
      }
    }

    if (remaining > 0) {
      throw new Error("สต็อกไม่พอสำหรับการตัดออก");
    }
  }

  return created;
}

async function bookRevenue(tx, brokerId, contract, grades, reqId) {
  const prices = contract ? {
    A: Number(contract.priceGradeA),
    B: Number(contract.priceGradeB),
    C: Number(contract.priceGradeC),
  } : {};

  for (const grade of ["A", "B", "C"]) {
    const weight = Number(grades[grade] || 0);
    const price = Number(prices[grade] || 0);
    if (weight > 0 && price > 0) {
      await tx.accountTransaction.create({
        data: {
          brokerId,
          type: "รายรับ",
          amount: weight * price,
          paymentMethod: "โอนเงิน",
          note: `รายรับจากส่งออก เกรด ${grade} = ${weight} กก. x ${price} บาท/กก. (req ${reqId.slice(0, 8)})`,
          invoiceRef: `EXPORT-${reqId.slice(0, 8)}-${grade}`,
          status: "รอการตรวจสอบ",
        },
      });
    }
  }
}

router.post("/requests/:id/approve", authenticate(), requireRole("owner"), async (req, res) => {
  const { id } = req.params;
  const request = await prisma.exportRequest.findUnique({ where: { id } });
  if (!request) return res.status(404).json({ message: "ไม่พบคำขอ" });
  if (request.status !== "รอการยืนยันจากเจ้าของสวน") {
    return res.status(400).json({ message: "คำขอไม่ได้อยู่ในสถานะรอการยืนยัน" });
  }

  const stock = await getStockByGrade(request.brokerId);
  if (Number(request.gradeA) > stock.A || Number(request.gradeB) > stock.B || Number(request.gradeC) > stock.C) {
    return res.status(400).json({ message: "สต็อกไม่พอสำหรับคำขอนี้" });
  }

  const contract = await getLatestAcceptedContract(request.brokerId);
  if (!contract) {
    return res.status(400).json({ message: "ไม่พบข้อเสนอที่ยอมรับของผู้รับเหมารายนี้" });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      await applyExport(tx, request.brokerId, { A: Number(request.gradeA), B: Number(request.gradeB), C: Number(request.gradeC) }, `Owner approved export request ${request.id.slice(0, 8)}`);
      await bookRevenue(tx, request.brokerId, contract, { A: Number(request.gradeA), B: Number(request.gradeB), C: Number(request.gradeC) }, request.id);
      const updatedRequest = await tx.exportRequest.update({
        where: { id },
        data: { status: "ยืนยันแล้ว" },
      });

      const fruits = await tx.fruitRecord.findMany({ where: { brokerId: request.brokerId } });
      return { updatedRequest, fruits };
    });

    res.json({
      data: {
        request: mapExportRequest(result.updatedRequest),
        fruits: result.fruits.map(mapFruit),
      },
    });
  } catch (err) {
    res.status(400).json({ message: err.message || "ไม่สามารถยืนยันคำขอได้" });
  }
});

router.post("/requests/:id/reject", authenticate(), requireRole("owner"), async (req, res) => {
  const { id } = req.params;
  const request = await prisma.exportRequest.findUnique({ where: { id } });
  if (!request) return res.status(404).json({ message: "ไม่พบคำขอ" });
  if (request.status !== "รอการยืนยันจากเจ้าของสวน") {
    return res.status(400).json({ message: "คำขอไม่ได้อยู่ในสถานะรอการยืนยัน" });
  }
  const updated = await prisma.exportRequest.update({ where: { id }, data: { status: "ปฏิเสธแล้ว" } });
  res.json({ data: mapExportRequest(updated) });
});

export default router;
