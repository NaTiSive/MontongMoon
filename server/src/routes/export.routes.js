import { Router } from "express";
import { z } from "zod";
import prisma from "../config/prisma.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { mapExportRequest, mapFruit } from "../utils/formatters.js";
import { computeNetStockByGrade } from "../utils/fruits.js";

const router = Router();

async function getStockByGrade(brokerId) {
  const { by_grade } = await computeNetStockByGrade({ brokerId, ownerId: 1 });
  const grades = { A: 0, B: 0, C: 0 };
  for (const grade of ["A", "B", "C"]) {
    grades[grade] = Math.max(0, Number(by_grade?.[grade] ?? 0));
  }
  return grades;
}

router.get("/stock", authenticate(), async (req, res) => {
  const brokerId = req.query.broker_id ? String(req.query.broker_id) : null;
  const effective = brokerId ?? (req.user.role === "broker" ? req.user.id : null);
  const stock = await getStockByGrade(effective);
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
      status: "pending",
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
    where.brokerId = String(brokerIdParam);
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
  if (request.status !== "pending") {
    return res.status(400).json({ message: "ยกเลิกได้เฉพาะคำขอที่ยังรอการยืนยันเท่านั้น" });
  }
  const updated = await prisma.exportRequest.update({
    where: { id },
    data: { status: "withdrawn" },
  });
  res.json({ data: mapExportRequest(updated) });
});

async function getLatestAcceptedContract(brokerId) {
  return prisma.contract.findFirst({
    where: { brokerId, status: "accepted" },
    orderBy: { contractDate: "desc" },
    include: { prices: true },
  });
}

async function nextFruitId(tx) {
  const last = await tx.durianFruit.findMany({ orderBy: { fruitId: "desc" }, take: 1 });
  if (!last.length) return "F001";
  const current = last[0].fruitId;
  const numeric = parseInt(current.replace(/^F/, ""), 10) || 0;
  const next = numeric + 1;
  return `F${next.toString().padStart(3, "0")}`;
}

async function nextAccountId(tx) {
  const last = await tx.account.findMany({ orderBy: { accountId: "desc" }, take: 1 });
  if (!last.length) return "AC001";
  const current = last[0].accountId;
  const numeric = parseInt(current.replace(/^AC/, ""), 10) || 0;
  const next = numeric + 1;
  return `AC${next.toString().padStart(3, "0")}`;
}

async function applyExport(tx, brokerId, grades) {
  const exported = [];
  const now = new Date();
  for (const grade of ["A", "B", "C"]) {
    let remaining = Number(grades[grade] || 0);
    if (remaining <= 0) continue;
    const harvestRecords = await tx.durianFruit.findMany({
      where: { brokerId, grade, type: "harvest" },
      orderBy: { date: "asc" },
    });

    for (const record of harvestRecords) {
      if (remaining <= 0) break;
      const weight = Number(record.amount);
      if (weight <= remaining + 1e-6) {
        remaining -= weight;
        const updated = await tx.durianFruit.update({
          where: { fruitId: record.fruitId },
          data: { type: "export", date: now },
        });
        exported.push(updated);
      } else {
        await tx.durianFruit.update({
          where: { fruitId: record.fruitId },
          data: { amount: weight - remaining },
        });
        const newRecord = await tx.durianFruit.create({
          data: {
            fruitId: await nextFruitId(tx),
            treeId: record.treeId,
            ownerId: record.ownerId,
            brokerId: record.brokerId,
            grade: record.grade,
            amount: remaining,
            type: "export",
            date: now,
          },
        });
        exported.push(newRecord);
        remaining = 0;
      }
    }

    if (remaining > 0) {
      throw new Error("สต็อกไม่พอสำหรับการตัดออก");
    }
  }
  return exported;
}

async function bookRevenue(tx, brokerId, contract, grades, reqId) {
  const priceMap = (contract?.prices || []).reduce((acc, price) => {
    acc[price.grade] = Number(price.price);
    return acc;
  }, {});
  for (const grade of ["A", "B", "C"]) {
    const weight = Number(grades[grade] || 0);
    const price = Number(priceMap[grade] || 0);
    if (weight > 0 && price > 0) {
      await tx.account.create({
        data: {
          accountId: await nextAccountId(tx),
          ownerId: 1,
          brokerId,
          type: "income",
          amount: weight * price,
          paymentMethod: "bankTransfer",
          note: `รายรับจากส่งออก เกรด ${grade} = ${weight} กก. x ${price} บาท/กก. (req ${reqId.slice(0, 8)})`,
          invoiceRef: `EXPORT-${reqId.slice(0, 8)}-${grade}`,
          status: "pending",
          date: new Date(),
        },
      });
    }
  }
}

router.post("/requests/:id/approve", authenticate(), requireRole("owner"), async (req, res) => {
  const { id } = req.params;
  const request = await prisma.exportRequest.findUnique({ where: { id } });
  if (!request) return res.status(404).json({ message: "ไม่พบคำขอ" });
  if (request.status !== "pending") {
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
      const exported = await applyExport(tx, request.brokerId, {
        A: Number(request.gradeA),
        B: Number(request.gradeB),
        C: Number(request.gradeC),
      });
      await bookRevenue(tx, request.brokerId, contract, {
        A: Number(request.gradeA),
        B: Number(request.gradeB),
        C: Number(request.gradeC),
      }, request.id);
      const updatedRequest = await tx.exportRequest.update({
        where: { id },
        data: { status: "confirmed" },
      });

      return { updatedRequest, exported };
    });

    res.json({
      data: {
        request: mapExportRequest(result.updatedRequest),
        fruits: result.exported.map(mapFruit),
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
  if (request.status !== "pending") {
    return res.status(400).json({ message: "คำขอไม่ได้อยู่ในสถานะรอการยืนยัน" });
  }
  const updated = await prisma.exportRequest.update({ where: { id }, data: { status: "rejected" } });
  res.json({ data: mapExportRequest(updated) });
});

export default router;
