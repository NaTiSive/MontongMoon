// src/api/export.js
// Helpers for UC15 (Broker submit export request) & UC16 (Owner approve export)
// ใช้ร่วมกับ fruits.js (type: "เก็บเกี่ยว" | "ส่งออก"), contracts.js, accounts.js

const FRUITS_KEY = "mm:fruits@v1";
const EXPORT_REQ_KEY = "mm:export-requests@v1";

function loadLS(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback ?? null)); }
  catch { return fallback ?? null; }
}
function saveLS(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}
function uuid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,(c)=>{
    const r=(Math.random()*16)|0, v=c==="x"?r:(r&0x3)|0x8; return v.toString(16);
  });
}

// ─────────────────────────────────────────────────────────────
// STOCK: คำนวณ "พร้อมส่งออก" = เก็บเกี่ยวรวม − ส่งออกรวม (ต่อ Broker)
// ถ้าไม่ส่ง broker_id จะคำนวณรวมทั้งระบบ (use ในหน้า Owner preview ก็ได้)
export function getAvailableStockByGrade({ broker_id = null } = {}) {
  const rows = loadLS(FRUITS_KEY, []) || [];
  const isMine = (r) => broker_id == null ? true : String(r?.broker_id ?? "") === String(broker_id);

  const sum = (grade, type) =>
    rows.filter(r => r?.grade === grade && r?.type === type && isMine(r))
        .reduce((s, r) => s + Number(r?.weight_kg || 0), 0);

  const calc = (g) => Math.max(0, sum(g, "เก็บเกี่ยว") - sum(g, "ส่งออก"));

  return {
    A: calc("A"),
    B: calc("B"),
    C: calc("C"),
  };
}

// ─────────────────────────────────────────────────────────────
// UC15: Broker ส่งคำขอส่งออก
export function submitExportRequest({ broker_id, grades }) {
  // grades = { A: number, B: number, C: number } (เอาสต็อกปัจจุบันหรือให้กรอกเอง)
  const a = Number(grades?.A || 0);
  const b = Number(grades?.B || 0);
  const c = Number(grades?.C || 0);
  if ([a,b,c].every(v => !v || v <= 0)) throw new Error("น้ำหนักอย่างน้อยหนึ่งเกรดต้องมากกว่า 0");

  // ตรวจว่าไม่มากกว่าสต็อกพร้อมส่งออก
  const stock = getAvailableStockByGrade({ broker_id });
  if (a > stock.A || b > stock.B || c > stock.C) {
    throw new Error("น้ำหนักบางเกรดเกินกว่าสต็อกพร้อมส่งออก");
  }

  const req = {
    id: uuid(),
    broker_id,
    created_at: new Date().toISOString(),
    updated_at: null,
    grades: { A: a, B: b, C: c },
    status: "รอการยืนยันจากเจ้าของสวน", // UC15
  };

  const all = loadLS(EXPORT_REQ_KEY, []) || [];
  all.unshift(req);
  saveLS(EXPORT_REQ_KEY, all);
  return req;
}

// ─────────────────────────────────────────────────────────────
// ข้อมูลคำขอ: ทั้งหมด / ต่อ Broker
export function listAllExportRequests() {
  const all = loadLS(EXPORT_REQ_KEY, []) || [];
  return all.sort((x,y) => new Date(y.created_at) - new Date(x.created_at));
}
export function listBrokerExportRequests(broker_id) {
  return listAllExportRequests().filter(r => String(r.broker_id) === String(broker_id));
}

// ─────────────────────────────────────────────────────────────
// (ออปชัน) Broker ถอนคำขอก่อน Owner ยืนยัน
export function withdrawExportRequest({ req_id, broker_id }) {
  const all = loadLS(EXPORT_REQ_KEY, []) || [];
  const idx = all.findIndex(r => r.id === req_id && String(r.broker_id) === String(broker_id));
  if (idx === -1) throw new Error("ไม่พบคำขอ");
  if (all[idx].status !== "รอการยืนยันจากเจ้าของสวน") {
    throw new Error("ยกเลิกได้เฉพาะคำขอที่ยังรอการยืนยันเท่านั้น");
  }
  all[idx].status = "ผู้รับเหมาถอนคำขอ";
  all[idx].updated_at = new Date().toISOString();
  saveLS(EXPORT_REQ_KEY, all);
  return all[idx];
}

// ─────────────────────────────────────────────────────────────
// UC16: Owner อนุมัติ → ตัดสต็อกเก็บเกี่ยว + เพิ่มส่งออก + ลงรายรับ
import { listBrokerContracts } from "./contracts";
import { createTransaction } from "./accounts";

// หา contract ล่าสุดของ broker ที่สถานะ "ยอมรับ"
export function getLatestAcceptedContractByBroker(broker_id) {
  const mine = listBrokerContracts(broker_id) || [];
  const accepted = mine.filter(c => c.status === "ยอมรับ")
                       .sort((a,b) => new Date(b.contract_date) - new Date(a.contract_date));
  return accepted[0] || null;
}

// ตัดสต็อก "เก็บเกี่ยว" ต่อเกรด (FIFO) + เพิ่ม record "ส่งออก"
function applyExportConsumeAndRecord({ broker_id, grades, note }) {
  const allFruits = loadLS(FRUITS_KEY, []) || [];
  const now = new Date().toISOString();

  // 1) เพิ่ม record type="ส่งออก" ต่อเกรดที่ > 0
  ["A","B","C"].forEach(g => {
    const w = Number(grades[g] || 0);
    if (w > 0) {
      allFruits.push({
        id: uuid(),
        broker_id,
        grade: g,
        weight_kg: w,
        type: "ส่งออก",
        note: note || "Owner approved export",
        harvest_at: now,
      });
    }
  });

  // 2) หักจาก "เก็บเกี่ยว" (เฉพาะของ broker นี้) แบบ FIFO
  const need = { A: Number(grades.A||0), B: Number(grades.B||0), C: Number(grades.C||0) };

  // ใช้ index order เดิม (เก่า→ใหม่) = FIFO
  for (const rec of allFruits) {
    if (rec.type !== "เก็บเกี่ยว") continue;
    if (String(rec.broker_id) !== String(broker_id)) continue;
    const g = rec.grade;
    if (!need[g] || need[g] <= 0) continue;

    const w = Number(rec.weight_kg);
    if (w <= need[g]) {
      rec._remove = true;
      need[g] = need[g] - w;
    } else {
      rec.weight_kg = w - need[g];
      need[g] = 0;
    }
  }

  const updated = allFruits.filter(f => !f._remove);
  saveLS(FRUITS_KEY, updated);
  return updated;
}

// ลงบัญชี “รายรับ” ตามราคาต่อเกรด
function bookRevenueForExport({ broker_id, contract, grades, reqId }) {
  const prices = contract?.offerprice_by_grade || {};
  ["A","B","C"].forEach(g => {
    const w = Number(grades[g] || 0);
    const price = Number(prices[g] || 0);
    if (w > 0 && price > 0) {
      const amount = w * price; // บาท
      createTransaction(broker_id, {
        type: "รายรับ",
        amount,
        payment_method: "โอนเงิน",
        note: `รายรับจากส่งออก เกรด ${g} = ${w} กก. x ${price} บาท/กก. (req ${String(reqId).slice(0,8)})`,
        invoice_ref: `EXPORT-${String(reqId).slice(0,8)}-${g}`,
      });
    }
  });
}

// Owner อนุมัติคำขอส่งออก
export function ownerApproveExportRequest(req_id) {
  const reqs = loadLS(EXPORT_REQ_KEY, []) || [];
  const idx = reqs.findIndex(r => r.id === req_id);
  if (idx === -1) throw new Error("ไม่พบคำขอ");
  const req = reqs[idx];
  if (req.status !== "รอการยืนยันจากเจ้าของสวน") {
    throw new Error("คำขอนี้ไม่ได้อยู่ในสถานะรอการยืนยัน");
  }

  // ตรวจว่าสต็อกพอ (กัน race with another approval)
  const stock = getAvailableStockByGrade({ broker_id: req.broker_id });
  const a = Number(req.grades.A||0), b = Number(req.grades.B||0), c = Number(req.grades.C||0);
  if (a > stock.A || b > stock.B || c > stock.C) {
    throw new Error("สต็อกไม่พอสำหรับคำขอนี้ (มีการเปลี่ยนแปลงระหว่างรออนุมัติ)");
  }

  // หา contract ล่าสุดที่ “ยอมรับ” ของ broker นี้
  const contract = getLatestAcceptedContractByBroker(req.broker_id);
  if (!contract) throw new Error("ไม่พบบันทึกข้อเสนอที่ยอมรับของผู้รับเหมารายนี้");

  // 1) ลง fruits: เพิ่ม "ส่งออก" + หัก "เก็บเกี่ยว"
  const updatedFruits = applyExportConsumeAndRecord({
    broker_id: req.broker_id,
    grades: req.grades,
    note: `Owner approved export request ${req.id.slice(0,8)}`,
  });

  // 2) ลงบัญชีรายรับ ต่อเกรด
  bookRevenueForExport({
    broker_id: req.broker_id,
    contract,
    grades: req.grades,
    reqId: req.id,
  });

  // 3) ปรับสถานะคำขอ
  reqs[idx] = { ...req, status: "ยืนยันแล้ว", updated_at: new Date().toISOString() };
  saveLS(EXPORT_REQ_KEY, reqs);

  return { request: reqs[idx], fruits: updatedFruits };
}

// Owner ปฏิเสธคำขอ
export function ownerRejectExportRequest(req_id) {
  const reqs = loadLS(EXPORT_REQ_KEY, []) || [];
  const idx = reqs.findIndex(r => r.id === req_id);
  if (idx === -1) throw new Error("ไม่พบคำขอ");
  const req = reqs[idx];
  if (req.status !== "รอการยืนยันจากเจ้าของสวน") {
    throw new Error("คำขอนี้ไม่ได้อยู่ในสถานะรอการยืนยัน");
  }
  reqs[idx] = { ...req, status: "ปฏิเสธแล้ว", updated_at: new Date().toISOString() };
  saveLS(EXPORT_REQ_KEY, reqs);
  return reqs[idx];
}
