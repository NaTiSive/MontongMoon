// server/src/routes/export.routes.js
import { Router } from "express";
import prisma from "../config/prisma.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { mapExportRequest, mapFruit, normalizeFruitFlowCode } from "../utils/formatters.js";

const router = Router();

// ค่าที่ใช้ใน DB (ภาษาไทย)
const TYPE_HARVEST_PREFIX = "เก็บเกี่ยว";
const TYPE_EXPORT = "ขนส่งออก";
const GRADES = ["A", "B", "C"];
const EPSILON = 1e-9;

/* ---------- Helpers: next ids ---------- */
async function nextFruitId(tx) {
  const [row] = await tx.$queryRawUnsafe(
    `SELECT COALESCE(MAX(CAST(SUBSTRING(fruit_id, 2) AS UNSIGNED)), 0) AS maxnum
       FROM durian_fruit
      WHERE fruit_id REGEXP '^F[0-9]+'`
  );
  const n = Number(row?.maxnum ?? 0) + 1;
  return `F${String(n).padStart(3, "0")}`;
}

async function nextAccountId(tx) {
  const [row] = await tx.$queryRawUnsafe(
    `SELECT COALESCE(MAX(CAST(SUBSTRING(account_id, 3) AS UNSIGNED)), 0) AS maxnum
       FROM account
      WHERE account_id REGEXP '^AC[0-9]+'`
  );
  const n = Number(row?.maxnum ?? 0) + 1;
  return `AC${String(n).padStart(3, "0")}`;
}

/* ---------- Helpers: stock / price ---------- */
// สต็อกพร้อมส่งออกของ broker: (เก็บเกี่ยว*) - (ขนส่งออก)
async function getStockByGrade(brokerId) {
  const result = { A: 0, B: 0, C: 0 };
  if (!brokerId) return result;

  const harvested = await prisma.$queryRawUnsafe(
    `SELECT grade, COALESCE(SUM(amount),0) AS sum_amount
       FROM durian_fruit
      WHERE broker_id = ?
        AND grade IN ('A','B','C')
        AND TRIM(type) LIKE '${TYPE_HARVEST_PREFIX}%'
      GROUP BY grade`,
    brokerId
  );

  const exported = await prisma.$queryRawUnsafe(
    `SELECT grade, COALESCE(SUM(amount),0) AS sum_amount
       FROM durian_fruit
      WHERE broker_id = ?
        AND grade IN ('A','B','C')
        AND TRIM(type) = '${TYPE_EXPORT}'
      GROUP BY grade`,
    brokerId
  );

  const h = Object.fromEntries(harvested.map(r => [r.grade, Number(r.sum_amount || 0)]));
  const e = Object.fromEntries(exported.map(r => [r.grade, Number(r.sum_amount || 0)]));

  for (const g of GRADES) {
    result[g] = Math.max(0, (h[g] || 0) - (e[g] || 0));
  }
  return result;
}

// อ่านราคา/กก. จากสัญญา "ยอมรับ" ล่าสุดของ broker; ถ้าไม่มีให้ใช้สัญญาล่าสุดของ broker
async function getPriceMap(brokerId) {
  const map = { A: 0, B: 0, C: 0 };
  if (!brokerId) return map;

  let useId = null;
  const [acc] = await prisma.$queryRawUnsafe(
    `SELECT contract_id
       FROM contract
      WHERE broker_id = ?
        AND status = 'ยอมรับ'
      ORDER BY contract_date DESC
      LIMIT 1`,
    brokerId
  );
  if (acc?.contract_id) useId = acc.contract_id;

  if (!useId) {
    const [latest] = await prisma.$queryRawUnsafe(
      `SELECT contract_id
         FROM contract
        WHERE broker_id = ?
        ORDER BY contract_date DESC
        LIMIT 1`,
      brokerId
    );
    useId = latest?.contract_id || null;
  }
  if (!useId) return map;

  const rows = await prisma.$queryRawUnsafe(
    `SELECT grade, price
       FROM contract_price
      WHERE contract_id = ?`,
    useId
  );
  for (const r of rows) {
    if (GRADES.includes(r.grade)) map[r.grade] = Number(r.price || 0);
  }
  return map;
}

/* ---------- Helpers: export requests ---------- */
function parseReservedFruitIds(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
  } catch {
    return [];
  }
}
function serializeReservedFruitIds(ids) {
  const uniq = Array.from(new Set((ids || []).map(String).filter(Boolean)));
  return uniq.length ? JSON.stringify(uniq) : null;
}
async function loadReservedFruits(tx, ids) {
  if (!ids.length) return [];
  const records = await tx.$queryRawUnsafe(
    `SELECT fruit_id, tree_id, owner_id, broker_id, grade, amount, type, date
       FROM durian_fruit
      WHERE fruit_id IN (${ids.map(() => "?").join(",")})`,
    ...ids
  );
  const map = new Map(records.map(r => [r.fruit_id, r]));
  return ids.map(id => map.get(id)).filter(Boolean);
}
async function attachReservedFruits(request, tx = prisma) {
  if (!request) return null;
  const ids = parseReservedFruitIds(request.reservedFruits);
  if (!ids.length) return { ...request, fruits: [] };
  const fruits = await loadReservedFruits(tx, ids);
  return { ...request, fruits };
}
async function getRequestWithFruits(id, tx = prisma) {
  const [request] = await tx.$queryRawUnsafe(
    `SELECT * FROM export_request WHERE id = ?`,
    id
  );
  return attachReservedFruits(request, tx);
}
function sumGradesFromFruits(fruits = []) {
  const totals = { A: 0, B: 0, C: 0 };
  for (const fruit of fruits) {
    if (!fruit) continue;
    const t = normalizeFruitFlowCode(fruit.type); // ไทย -> 'export' ได้
    if (t !== "export") continue;
    if (!GRADES.includes(fruit.grade)) continue;
    totals[fruit.grade] += Number(fruit.amount || 0);
  }
  return totals;
}

/* ---------- Reserve / Release ---------- */
// จองผลไม้เพื่อส่งออก: แปลง/แตกแถว "เก็บเกี่ยว*" -> "ขนส่งออก"
async function reserveExportFruits(tx, brokerId, wantByGrade) {
  const reserved = [];
  const stock = await getStockByGrade(brokerId);
  for (const g of GRADES) {
    const want = Number(wantByGrade[g] || 0);
    if (want > (stock[g] || 0) + EPSILON) {
      throw new Error(`สต็อกเกรด ${g} ไม่เพียงพอ (มี ${stock[g]} ต้องการ ${want})`);
    }
  }

  for (const grade of GRADES) {
    let remaining = Number(wantByGrade[grade] || 0);
    if (remaining <= EPSILON) continue;

    const rows = await tx.$queryRawUnsafe(
      `SELECT fruit_id, tree_id, owner_id, broker_id, grade, amount, type, date
         FROM durian_fruit
        WHERE broker_id = ?
          AND grade = ?
          AND TRIM(type) LIKE '${TYPE_HARVEST_PREFIX}%'
        ORDER BY date ASC, fruit_id ASC`,
      brokerId, grade
    );

    for (const r of rows) {
      if (remaining <= EPSILON) break;
      const available = Number(r.amount || 0);
      if (available <= EPSILON) continue;

      if (available <= remaining + EPSILON) {
        // ใช้ทั้งแถว -> เปลี่ยน type เป็น "ขนส่งออก"
        await tx.$executeRawUnsafe(
          `UPDATE durian_fruit SET type = ? WHERE fruit_id = ?`,
          TYPE_EXPORT, r.fruit_id
        );
        reserved.push({ ...r, type: TYPE_EXPORT });
        remaining -= available;
      } else {
        // ใช้บางส่วน -> หักแถวเดิม + สร้างแถวใหม่เป็น "ขนส่งออก"
        const leftover = available - remaining;

        await tx.$executeRawUnsafe(
          `UPDATE durian_fruit SET amount = ? WHERE fruit_id = ?`,
          leftover, r.fruit_id
        );

        const newId = await nextFruitId(tx);
        await tx.$executeRawUnsafe(
          `INSERT INTO durian_fruit
             (fruit_id, tree_id, owner_id, broker_id, grade, amount, type, date)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          newId, r.tree_id, r.owner_id, r.broker_id, r.grade, remaining, TYPE_EXPORT, r.date
        );

        reserved.push({
          fruit_id: newId,
          tree_id: r.tree_id,
          owner_id: r.owner_id,
          broker_id: r.broker_id,
          grade: r.grade,
          amount: remaining,
          type: TYPE_EXPORT,
          date: r.date,
        });
        remaining = 0;
      }
    }

    if (remaining > EPSILON) throw new Error(`สต็อกเกรด ${grade} ไม่เพียงพอ`);
  }

  return reserved;
}

// ยกเลิกการจอง -> เปลี่ยน "ขนส่งออก" กลับเป็น "เก็บเกี่ยว"
async function releaseReservedFruits(tx, request) {
  const fruits = request?.fruits || [];
  for (const f of fruits) {
    if (!f) continue;
    const t = normalizeFruitFlowCode(f.type);
    if (t !== "export") continue;
    await tx.$executeRawUnsafe(
      `UPDATE durian_fruit SET type = ? WHERE fruit_id = ?`,
      TYPE_HARVEST_PREFIX, f.fruit_id
    );
  }
}

/* ---------- Revenue booking ---------- */
// ดึงสัญญา (ไทย) + ราคาต่อเกรดจาก contract_price.price
async function getLatestAcceptedContract(brokerId) {
  // ยอมรับล่าสุดก่อน; ถ้าไม่มี ตกไปล่าสุด
  const [acc] = await prisma.$queryRawUnsafe(
    `SELECT contract_id
       FROM contract
      WHERE broker_id = ?
        AND status = 'ยอมรับ'
      ORDER BY contract_date DESC
      LIMIT 1`,
    brokerId
  );
  let cid = acc?.contract_id || null;
  if (!cid) {
    const [any] = await prisma.$queryRawUnsafe(
      `SELECT contract_id
         FROM contract
        WHERE broker_id = ?
        ORDER BY contract_date DESC
        LIMIT 1`,
      brokerId
    );
    cid = any?.contract_id || null;
  }
  if (!cid) return { contract_id: null, prices: {} };

  const rows = await prisma.$queryRawUnsafe(
    `SELECT grade, price FROM contract_price WHERE contract_id = ?`,
    cid
  );
  const prices = {};
  for (const r of rows) if (GRADES.includes(r.grade)) prices[r.grade] = Number(r.price || 0);
  return { contract_id: cid, prices };
}

async function bookRevenue(tx, brokerId, contract, totals, reqId) {
  const priceMap = contract?.prices || {};
  for (const g of GRADES) {
    const weight = Number(totals[g] || 0);
    const price = Number(priceMap[g] || 0);
    if (weight > EPSILON && price > 0) {
      await tx.$executeRawUnsafe(
        `INSERT INTO account
           (account_id, owner_id, broker_id, type, amount, payment_method, note, invoice_ref, status, date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        await nextAccountId(tx),
        1, brokerId,
        'income',
        weight * price,
        'bankTransfer',
        `รายรับจากส่งออก เกรด ${g} = ${weight} กก. x ${price} บาท/กก. (req ${String(reqId).slice(0,8)})`,
        `EXPORT-${String(reqId).slice(0,8)}-${g}`,
        'pending',
        new Date()
      );
    }
  }
}

/* ============ ROUTES ============ */
// GET /export/stock?broker_id=1  -> amount + price + value ต่อเกรด
router.get("/stock", authenticate(), async (req, res) => {
  try {
    const brokerId = String(req.query.broker_id || req.query.brokerId || (req.user.role === "broker" ? req.user.id : "1"));
    const [amounts, prices] = await Promise.all([
      getStockByGrade(brokerId),
      getPriceMap(brokerId),
    ]);

    const stock = {};
    let grandTotal = 0;
    for (const g of GRADES) {
      const amount = Number(amounts[g] || 0);
      const price = Number(prices[g] || 0);
      const value = +(amount * price).toFixed(2);
      stock[g] = { amount, price, value };
      grandTotal += value;
    }

    res.json({ stock, grandTotal: +grandTotal.toFixed(2) });
  } catch (err) {
    console.error("❌ /export/stock error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /export/requests  (broker ส่งคำขอ)
router.post("/requests", authenticate(), requireRole("broker"), async (req, res) => {
  const grades = {
    A: Number(req.body?.grades?.A || 0),
    B: Number(req.body?.grades?.B || 0),
    C: Number(req.body?.grades?.C || 0),
  };
  if (GRADES.every(g => (grades[g] || 0) <= EPSILON)) {
    return res.status(400).json({ message: "น้ำหนักอย่างน้อยหนึ่งเกรดต้องมากกว่า 0" });
  }

  const stock = await getStockByGrade(String(req.user.id));
  for (const g of GRADES) {
    if (Number(grades[g] || 0) > Number(stock[g] || 0)) {
      return res.status(400).json({ message: "น้ำหนักบางเกรดเกินกว่าสต็อกพร้อมส่งออก" });
    }
  }

  try {
    const created = await prisma.$transaction(async (tx) => {
      // สร้างคำขอ
      const [{ id: reqId }] = await tx.$queryRawUnsafe(`SELECT UUID() AS id`);
      await tx.$executeRawUnsafe(
        `INSERT INTO export_request (id, broker_id, grade_a, grade_b, grade_c, status, created_at, reserved_fruits)
         VALUES (?, ?, ?, ?, ?, 'pending', NOW(), NULL)`,
       reqId, String(req.user.id), grades.A, grades.B, grades.C
      );
      const [request] = await tx.$queryRawUnsafe(
        `SELECT * FROM export_request WHERE id = ?`,
        reqId
      );

      // จองผลผลิต
      const reserved = await reserveExportFruits(tx, String(req.user.id), grades);
      const totals = sumGradesFromFruits(reserved);
      const reservedIds = reserved.map(f => f.fruit_id);

      // อัปเดตรายการที่สร้าง
      await tx.$executeRawUnsafe(
        `UPDATE export_request
            SET grade_a = ?, grade_b = ?, grade_c = ?, reserved_fruits = ?
          WHERE id = ?`,
        totals.A, totals.B, totals.C, serializeReservedFruitIds(reservedIds), request.id
      );

      const withFruits = await attachReservedFruits(request, tx);
      return withFruits;
    });

    res.status(201).json({ data: mapExportRequest(created) });
  } catch (err) {
    console.error("❌ POST /export/requests error:", err);
    res.status(400).json({ message: err.message || "ไม่สามารถสร้างคำขอได้" });
  }
});

// GET /export/requests  (owner/broker ดูรายการ)
router.get("/requests", authenticate(), async (req, res) => {
  const whereSql = [];
  const params = [];
  if (req.user.role === "broker") {
    whereSql.push("broker_id = ?");
    params.push(String(req.user.id));
  }
  if (req.query.broker_id) {
    whereSql.push("broker_id = ?");
    params.push(String(req.query.broker_id));
  }
  const sql =
    `SELECT * FROM export_request ` +
    (whereSql.length ? `WHERE ${whereSql.join(" AND ")} ` : "") +
    `ORDER BY created_at DESC`;

  const rows = await prisma.$queryRawUnsafe(sql, ...params);
  const withFruits = await Promise.all(rows.map((r) => attachReservedFruits(r)));
  res.json({ data: withFruits.map(mapExportRequest) });
});

// POST /export/requests/:id/withdraw  (broker ยกเลิกคำขอที่ยัง pending)
router.post("/requests/:id/withdraw", authenticate(), requireRole("broker"), async (req, res) => {
  const { id } = req.params;
  const request = await getRequestWithFruits(id);
  if (!request || String(request.brokerId) !== String(req.user.id)) {
    return res.status(404).json({ message: "ไม่พบคำขอ" });
  }
  if (request.status !== "pending") {
    return res.status(400).json({ message: "ยกเลิกได้เฉพาะคำขอที่ยังรอการยืนยันเท่านั้น" });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const current = await getRequestWithFruits(id, tx);
    await releaseReservedFruits(tx, current);
    await tx.$executeRawUnsafe(
      `UPDATE export_request SET status = 'withdrawn', reserved_fruits = NULL WHERE id = ?`,
      id
    );
    const cleared = await getRequestWithFruits(id, tx);
    return cleared;
  });

  res.json({ data: mapExportRequest(updated) });
});

// POST /export/requests/:id/approve  (owner อนุมัติ)
router.post("/requests/:id/approve", authenticate(), requireRole("owner"), async (req, res) => {
  const { id } = req.params;
  const request = await getRequestWithFruits(id);
  if (!request) return res.status(404).json({ message: "ไม่พบคำขอ" });
  if (request.status !== "pending") {
    return res.status(400).json({ message: "คำขอไม่ได้อยู่ในสถานะรอการยืนยัน" });
  }

  const contract = await getLatestAcceptedContract(request.brokerId);
  if (!contract?.contract_id) {
    return res.status(400).json({ message: "ไม่พบข้อเสนอที่ยอมรับของผู้รับเหมารายนี้" });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const current = await getRequestWithFruits(id, tx);
      const reservedFruits = (current?.fruits || []).filter(
        (f) => f && normalizeFruitFlowCode(f.type) === "export"
      );
      const totals = sumGradesFromFruits(reservedFruits);
      const totalWeight = totals.A + totals.B + totals.C;
      if (!reservedFruits.length || totalWeight <= EPSILON) {
        throw new Error("ไม่พบผลผลิตที่จองไว้สำหรับคำขอนี้");
      }

      // stamp วันที่ส่งออกจริงให้ผลไม้ที่จองไว้ (ยังคง type = ขนส่งออก)
      const now = new Date();
      for (const f of reservedFruits) {
        await tx.$executeRawUnsafe(
          `UPDATE durian_fruit SET date = ? WHERE fruit_id = ?`,
          now, f.fruit_id
        );
      }

      // ลงบัญชีรายรับตามราคาในสัญญา
      await bookRevenue(tx, String(current.brokerId), contract, totals, id);

      // อนุมัติคำขอ
      await tx.$executeRawUnsafe(
        `UPDATE export_request
            SET status = 'confirmed',
                grade_a = ?, grade_b = ?, grade_c = ?,
                reserved_fruits = ?
          WHERE id = ?`,
        totals.A, totals.B, totals.C,
        serializeReservedFruitIds(reservedFruits.map(f => f.fruit_id)),
        id
      );

      const updated = await getRequestWithFruits(id, tx);
      return updated;
    });

    res.json({ data: mapExportRequest(result) });
  } catch (err) {
    console.error("❌ POST /export/requests/:id/approve error:", err);
    res.status(400).json({ message: err.message || "ไม่สามารถยืนยันคำขอได้" });
  }
});

// POST /export/requests/:id/reject  (owner ปฏิเสธ)
router.post("/requests/:id/reject", authenticate(), requireRole("owner"), async (req, res) => {
  const { id } = req.params;
  const request = await getRequestWithFruits(id);
  if (!request) return res.status(404).json({ message: "ไม่พบคำขอ" });
  if (request.status !== "pending") {
    return res.status(400).json({ message: "คำขอไม่ได้อยู่ในสถานะรอการยืนยัน" });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const current = await getRequestWithFruits(id, tx);
    await releaseReservedFruits(tx, current);
    await tx.$executeRawUnsafe(
      `UPDATE export_request SET status = 'rejected', reserved_fruits = NULL WHERE id = ?`,
      id
    );
    const cleared = await getRequestWithFruits(id, tx);
    return cleared;
  });

  res.json({ data: mapExportRequest(updated) });
});

export default router;
