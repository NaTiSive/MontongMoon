import { Router } from "express";
import { z } from "zod";
import prisma from "../config/prisma.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { mapExportRequest, mapFruit } from "../utils/formatters.js";
import { computeNetStockByGrade } from "../utils/fruits.js";

const router = Router();
const EXPORT_GRADES = ["A", "B", "C"];
const EPSILON = 1e-6;

async function getStockByGrade(brokerId) {
  const { by_grade } = await computeNetStockByGrade({ brokerId, ownerId: 1 });
  const grades = { A: 0, B: 0, C: 0 };
  for (const grade of EXPORT_GRADES) {
    grades[grade] = Math.max(0, Number(by_grade?.[grade] ?? 0));
  }
  return grades;
}

function sumGradesFromFruits(fruits = []) {
  const totals = { A: 0, B: 0, C: 0 };
  for (const fruit of fruits) {
    if (!fruit || fruit.type !== "export") continue;
    if (!EXPORT_GRADES.includes(fruit.grade)) continue;
    totals[fruit.grade] += Number(fruit.amount ?? 0);
  }
  return totals;
}

async function getRequestWithFruits(id, tx = prisma) {
  return tx.exportRequest.findUnique({
    where: { id },
    include: { fruits: { include: { fruit: true } } },
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

async function reserveExportFruits(tx, brokerId, grades) {
  const reserved = [];
  for (const grade of EXPORT_GRADES) {
    let remaining = Number(grades[grade] || 0);
    if (remaining <= EPSILON) continue;
    const harvestRecords = await tx.durianFruit.findMany({
      where: { brokerId, grade, type: "harvest" },
      orderBy: [{ date: "asc" }, { fruitId: "asc" }],
    });

    for (const record of harvestRecords) {
      if (remaining <= EPSILON) break;
      const available = Number(record.amount);
      if (available <= EPSILON) continue;

      if (available <= remaining + EPSILON) {
        remaining -= available;
        const updated = await tx.durianFruit.update({
          where: { fruitId: record.fruitId },
          data: { type: "export" },
        });
        reserved.push(updated);
      } else {
        const leftover = available - remaining;
        await tx.durianFruit.update({
          where: { fruitId: record.fruitId },
          data: { amount: leftover },
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
            date: record.date,
          },
        });
        reserved.push(newRecord);
        remaining = 0;
      }
    }

    if (remaining > EPSILON) {
      throw new Error("สต็อกไม่พอสำหรับการจอง");
    }
  }
  return reserved;
}

async function linkReservedFruits(tx, requestId, fruits) {
  if (!fruits.length) return;
  await tx.exportRequestFruit.createMany({
    data: fruits.map((fruit) => ({ requestId, fruitId: fruit.fruitId })),
    skipDuplicates: true,
  });
}

async function releaseReservedFruits(tx, requestId) {
  const assignments = await tx.exportRequestFruit.findMany({
    where: { requestId },
    include: { fruit: true },
  });
  const released = [];
  for (const assignment of assignments) {
    const fruit = assignment.fruit;
    if (!fruit || fruit.type !== "export") continue;
    const updated = await tx.durianFruit.update({
      where: { fruitId: fruit.fruitId },
      data: { type: "harvest" },
    });
    released.push(updated);
  }
  return released;
}

async function getLatestAcceptedContract(brokerId) {
  return prisma.contract.findFirst({
    where: { brokerId, status: "accepted" },
    orderBy: { contractDate: "desc" },
    include: { prices: true },
  });
}

async function bookRevenue(tx, brokerId, contract, grades, reqId) {
  const priceMap = (contract?.prices || []).reduce((acc, price) => {
    acc[price.grade] = Number(price.price);
    return acc;
  }, {});
  for (const grade of EXPORT_GRADES) {
    const weight = Number(grades[grade] || 0);
    const price = Number(priceMap[grade] || 0);
    if (weight > EPSILON && price > 0) {
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
  if (EXPORT_GRADES.every((grade) => Number(grades[grade] || 0) <= EPSILON)) {
    return res.status(400).json({ message: "น้ำหนักอย่างน้อยหนึ่งเกรดต้องมากกว่า 0" });
  }

  const stock = await getStockByGrade(req.user.id);
  if (grades.A > stock.A || grades.B > stock.B || grades.C > stock.C) {
    return res.status(400).json({ message: "น้ำหนักบางเกรดเกินกว่าสต็อกพร้อมส่งออก" });
  }

  try {
    const created = await prisma.$transaction(async (tx) => {
      const request = await tx.exportRequest.create({
        data: {
          brokerId: req.user.id,
          gradeA: grades.A,
          gradeB: grades.B,
          gradeC: grades.C,
          status: "pending",
        },
      });

      const reserved = await reserveExportFruits(tx, req.user.id, grades);
      if (!reserved.length) {
        throw new Error("ไม่สามารถจองผลผลิตได้");
      }

      await linkReservedFruits(tx, request.id, reserved);
      const totals = sumGradesFromFruits(reserved);
      return tx.exportRequest.update({
        where: { id: request.id },
        data: {
          gradeA: totals.A,
          gradeB: totals.B,
          gradeC: totals.C,
        },
        include: { fruits: { include: { fruit: true } } },
      });
    });

    res.status(201).json({ data: mapExportRequest(created) });
  } catch (err) {
    res.status(400).json({ message: err.message || "ไม่สามารถสร้างคำขอได้" });
  }
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
    include: { fruits: { include: { fruit: true } } },
  });
  res.json({ data: requests.map(mapExportRequest) });
});

router.post("/requests/:id/withdraw", authenticate(), requireRole("broker"), async (req, res) => {
  const { id } = req.params;
  const request = await getRequestWithFruits(id);
  if (!request || request.brokerId !== req.user.id) {
    return res.status(404).json({ message: "ไม่พบคำขอ" });
  }
  if (request.status !== "pending") {
    return res.status(400).json({ message: "ยกเลิกได้เฉพาะคำขอที่ยังรอการยืนยันเท่านั้น" });
  }

  const updated = await prisma.$transaction(async (tx) => {
    await releaseReservedFruits(tx, id);
    return tx.exportRequest.update({
      where: { id },
      data: { status: "withdrawn" },
      include: { fruits: { include: { fruit: true } } },
    });
  });

  res.json({ data: mapExportRequest(updated) });
});

router.post("/requests/:id/approve", authenticate(), requireRole("owner"), async (req, res) => {
  const { id } = req.params;
  const request = await getRequestWithFruits(id);
  if (!request) return res.status(404).json({ message: "ไม่พบคำขอ" });
  if (request.status !== "pending") {
    return res.status(400).json({ message: "คำขอไม่ได้อยู่ในสถานะรอการยืนยัน" });
  }

  const contract = await getLatestAcceptedContract(request.brokerId);
  if (!contract) {
    return res.status(400).json({ message: "ไม่พบข้อเสนอที่ยอมรับของผู้รับเหมารายนี้" });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const current = await getRequestWithFruits(id, tx);
      const reservedFruits = (current?.fruits || [])
        .map((item) => item.fruit)
        .filter((fruit) => fruit && fruit.type === "export");
      const totals = sumGradesFromFruits(reservedFruits);
      const totalWeight = totals.A + totals.B + totals.C;
      if (!reservedFruits.length || totalWeight <= EPSILON) {
        throw new Error("ไม่พบผลผลิตที่จองไว้สำหรับคำขอนี้");
      }

      const now = new Date();
      const exported = [];
      for (const fruit of reservedFruits) {
        const updatedFruit = await tx.durianFruit.update({
          where: { fruitId: fruit.fruitId },
          data: { date: now },
        });
        exported.push(updatedFruit);
      }

      await bookRevenue(tx, current.brokerId, contract, totals, current.id);

      const updatedRequest = await tx.exportRequest.update({
        where: { id },
        data: {
          status: "confirmed",
          gradeA: totals.A,
          gradeB: totals.B,
          gradeC: totals.C,
        },
        include: { fruits: { include: { fruit: true } } },
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
  const request = await getRequestWithFruits(id);
  if (!request) return res.status(404).json({ message: "ไม่พบคำขอ" });
  if (request.status !== "pending") {
    return res.status(400).json({ message: "คำขอไม่ได้อยู่ในสถานะรอการยืนยัน" });
  }

  const updated = await prisma.$transaction(async (tx) => {
    await releaseReservedFruits(tx, id);
    return tx.exportRequest.update({
      where: { id },
      data: { status: "rejected" },
      include: { fruits: { include: { fruit: true } } },
    });
  });

  res.json({ data: mapExportRequest(updated) });
});

export default router;
