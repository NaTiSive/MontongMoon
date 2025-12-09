// server/src/routes/contracts.routes.js
import { Router } from "express";
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

// map payment term จากค่าฝั่ง UI เป็น enum ไทยใน DB
function normalizePaymentTerm(termRaw) {
  const s = String(termRaw || "").trim().toLowerCase();
  // รองรับทั้งไทย/อังกฤษ
  if (["เงินสด", "cash"].includes(s)) return "เงินสด";
  if (["โอนเงิน", "transfer", "banktransfer", "bank"].includes(s)) return "โอนเงิน";
  if (["ผ่อนชำระ", "installment"].includes(s)) return "ผ่อนชำระ";
  return "อื่นๆ";
}

// ---- routes -------------------------------------------------

router.get("/", async (_req, res) => {
  try {
    const rows = await prisma.$queryRawUnsafe(`
      SELECT contract_id, broker_id, owner_id, status, contract_date,
             qtt_estimate, offerprice, payment_term, note
        FROM contract
      ORDER BY contract_date DESC
    `);

    const data = rows.map(r => {
      // offerprice เก็บแบบ "A=100,B=90,C=80"
      let offerprice_by_grade = null;
      if (r.offerprice) {
        const map = {};
        for (const p of String(r.offerprice).split(",")) {
          const [k, v] = p.split("=");
          if (k && v && ["A","B","C"].includes(k.trim())) {
            map[k.trim()] = Number(v);
          }
        }
        if (Object.keys(map).length) offerprice_by_grade = map;
      }
      return { ...r, offerprice_by_grade };
    });

    res.json({ data });
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
  const note = String(req.body?.note || "");

  // log ไว้ช่วยดีบัก
  console.log("[POST /contracts] incoming:", {
    brokerId, qty, prices: {A, B, C}, term, noteLen: note.length
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
      const offerpriceStr = `A=${A},B=${B},C=${C}`;

      // insert contract
      await tx.$executeRawUnsafe(
        `INSERT INTO contract
           (contract_id, broker_id, owner_id, status, contract_date,
            qtt_estimate, offerprice, payment_term, note)
         VALUES (?, ?, ?, 'รอการพิจารณา', CURDATE(),
                 ?, ?, ?, ?)`,
        cid, brokerId, ownerId,
        qty, offerpriceStr, term, note
      );

      // insert contract_price 3 แถว (คอลัมน์ "price" ตามสคีมาจริง)
      const affected = await tx.$executeRawUnsafe(
        `INSERT INTO contract_price (contract_id, grade, price)
         VALUES (?, 'A', ?), (?, 'B', ?), (?, 'C', ?)`,
        cid, A, cid, B, cid, C
      );

      console.log("[POST /contracts] inserted:", { contract_id: cid, priceRows: affected });
      return { contract_id: cid };
    });

    return res.status(201).json({
      message: "สร้างข้อเสนอสำเร็จ",
      contract_id: result.contract_id,
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
      // ยกเลิกข้อเสนออื่นในรอบเดียวกันของ owner เดียวกันให้เป็น 'รอการพิจารณา'
      await tx.$executeRawUnsafe(
        `UPDATE contract SET status = 'รอการพิจารณา' WHERE owner_id = ?`,
        ownerId
      );
      // อนุมัติสัญญาที่เลือก
      await tx.$executeRawUnsafe(
        `UPDATE contract SET status = 'ยอมรับ' WHERE contract_id = ?`,
        id
      );
      // ผูก broker ให้กับต้นไม้และผลทุเรียนของ owner นี้
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

// GET /contracts/deadline
router.get("/deadline", async (_req, res) => {
  try {
    const [row] = await prisma.$queryRawUnsafe(`
      SELECT current_deadline_date
      FROM owner
      WHERE owner_id = 1
      LIMIT 1
    `);
    res.json(row || { current_deadline_date: null });
  } catch (err) {
    console.error("❌ GET /contracts/deadline error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// PUT /contracts/deadline
router.put("/deadline", async (req, res) => {
  const deadline = req.body?.deadline;
  if (!deadline) return res.status(400).json({ message: "Missing deadline" });

  try {
    await prisma.$executeRawUnsafe(
      `UPDATE owner
       SET current_deadline_date = ?, last_modified_deadline_date = CURDATE()
       WHERE owner_id = 1`,
      deadline
    );
    res.json({ current_deadline_date: deadline });
  } catch (err) {
    console.error("❌ PUT /contracts/deadline error:", err);
    res.status(500).json({ message: "Server error" });
  }
});


export default router;
