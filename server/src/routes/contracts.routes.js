// server/src/routes/contracts.routes.js
import { Router } from "express";
import { Prisma } from "@prisma/client";
import prisma from "../config/prisma.js";

const router = Router();

// ---- helpers ------------------------------------------------
async function nextContractId(tx) {
  const [row] = await tx.$queryRawUnsafe(
    `SELECT COALESCE(MAX(CAST(SUBSTRING(contract_id, 2) AS UNSIGNED)), 0) AS maxnum
       FROM contract
      WHERE contract_id REGEXP '^C[0-9]+'`
  );
  const n = Number(row?.maxnum ?? 0) + 1;
  return `C${String(n).padStart(3, "0")}`;
}

// map payment term จากค่าฝั่ง UI -> enum code ของ Prisma (ซึ่ง map เป็นค่าไทยใน DB)
function normalizePaymentTerm(termRaw) {
  const s = String(termRaw || "").trim().toLowerCase();
  // รองรับทั้งไทย/อังกฤษ -> map ไปเป็น enum code ของ Prisma
  if (["เงินสด", "cash"].includes(s)) return "cash";
  if (["โอนเงิน", "transfer", "banktransfer", "bank"].includes(s)) return "bankTransfer";
  if (["ผ่อนชำระ", "installment"].includes(s)) return "installment";
  return "other";
}

// ---- routes -------------------------------------------------

// GET /contracts
router.get("/", async (req, res) => {
  try {
    const brokerId = String(req.query?.broker_id || "").trim();
    const whereClause = brokerId ? Prisma.sql`WHERE broker_id = ${brokerId}` : Prisma.sql``;
    const rows = await prisma.$queryRaw(
      Prisma.sql`
      SELECT contract_id, broker_id, owner_id, status, contract_date,
             qtt_estimate, offerprice, payment_term, note
        FROM contract
        ${whereClause}
      ORDER BY contract_date DESC
    `
    );
    res.json({ data: rows });
  } catch (err) {
    console.error("❌ GET /contracts error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /contracts  -> สร้าง contract + 3 แถวใน contract_price (A/B/C)
router.post("/", async (req, res) => {
  // owner mock ตามระบบปัจจุบัน
  const ownerId = 1;

  // รับค่าจากฟอร์ม
  const brokerId = String(req.body?.broker_id || "").trim();
  const qty = Number(req.body?.qtt_estimate);
  const prices = req.body?.offerprice_by_grade ?? {};
  // อนุโลมกรณี UI ส่ง string มา
  const A = Number(prices.A); 
  const B = Number(prices.B);
  const C = Number(prices.C);
  const term = normalizePaymentTerm(req.body?.payment_term);
  const noteRaw = String(req.body?.note || "");
  const note = noteRaw.trim() === "" ? null : noteRaw.trim();

  // log ไว้ช่วยดีบัก
  console.log("[POST /contracts] incoming:", {
    brokerId,
    qty,
    prices: { A, B, C },
    term,
    noteLen: note?.length ?? 0,
  });

  // validate
  if (!brokerId) {
    return res.status(400).json({ message: "broker_id ว่าง" });
  }
  if (!Number.isFinite(qty) || qty <= 0) {
    return res.status(400).json({ message: "qtt_estimate ไม่ถูกต้อง" });
  }
  for (const [g, v] of Object.entries({ A, B, C })) {
    if (!Number.isFinite(v) || v <= 0) {
      return res.status(400).json({ message: `ราคาเกรด ${g} ไม่ถูกต้อง` });
    }
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const cid = await nextContractId(tx);
      const offerpriceStr = `${A},${B},${C}`;

      const created = await tx.contract.create({
        data: {
          contractId: cid,
          brokerId,
          ownerId,
          status: "pending",
          contractDate: new Date(),
          qtyEstimate: new Prisma.Decimal(qty),
          offerprice: offerpriceStr,
          paymentTerm: term,
          note,
        },
      });

      await tx.contractPrice.createMany({
        data: [
          { contractId: cid, grade: "A", price: new Prisma.Decimal(A) },
          { contractId: cid, grade: "B", price: new Prisma.Decimal(B) },
          { contractId: cid, grade: "C", price: new Prisma.Decimal(C) },
        ],
      });

      console.log("[POST /contracts] inserted:", { contract_id: cid });
      return created;
    });

    return res.status(201).json({
      message: "สร้างข้อเสนอสำเร็จ",
      data: {
        contract_id: result.contractId,
        broker_id: result.brokerId,
        owner_id: result.ownerId,
      },
    });
  } catch (err) {
    console.error("❌ POST /contracts error:", err);
    // ส่งรายละเอียดบางส่วนกลับไปช่วย debug หน้าเว็บ
    return res.status(500).json({
      message: "Server error",
      detail: err?.meta?.message || err?.message || String(err),
    });
  }
});

// POST /contracts/:id/approve
router.post("/:id/approve", async (req, res) => {
  const id = req.params.id;

  try {
    const [c] = await prisma.$queryRawUnsafe(
      `SELECT contract_id, owner_id, broker_id, status FROM contract WHERE contract_id = ?`,
      id
    );
    if (!c) return res.status(404).json({ message: "ไม่พบสัญญานี้" });

    const ownerId = Number(c.owner_id);
    const brokerId = c.broker_id;

    await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        `UPDATE contract SET status = 'รอการพิจารณา' WHERE owner_id = ?`,
        ownerId
      );
      await tx.$executeRawUnsafe(
        `UPDATE contract SET status = 'ยอมรับ', approved_at = NOW() WHERE contract_id = ?`,
        id
      );
      await tx.$executeRawUnsafe(
        `UPDATE durian_tree SET broker_id = ? WHERE owner_id = ?`,
        brokerId, ownerId
      );
      await tx.$executeRawUnsafe(
        `UPDATE durian_fruit SET broker_id = ? WHERE owner_id = ?`,
        brokerId, ownerId
      );
    });

    res.json({ message: "อนุมัติสัญญาสำเร็จ" });
  } catch (err) {
    console.error("❌ POST /contracts/:id/approve error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /contracts/:id/reject
router.post("/:id/reject", async (req, res) => {
  const id = req.params.id;
  try {
    const affected = await prisma.$executeRawUnsafe(
      `UPDATE contract SET status = 'ปฏิเสธ' WHERE contract_id = ?`,
      id
    );
    if (affected === 0) return res.status(404).json({ message: "ไม่พบสัญญา" });
    res.json({ message: "ปฏิเสธข้อเสนอเรียบร้อย" });
  } catch (err) {
    console.error("❌ POST /contracts/:id/reject error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
