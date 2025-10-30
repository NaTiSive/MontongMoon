// src/api/accounts.js
const KEY = "mm:accounts@v1";

function load() {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); }
  catch { return []; }
}
function save(arr) {
  localStorage.setItem(KEY, JSON.stringify(arr));
}
function uuid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0, v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * payload:
 * - type: "รายรับ" | "รายจ่าย"
 * - amount: number (>0)
 * - payment_method: "เงินสด" | "โอนเงิน" | "ผ่อนชำระ"
 * - note: string
 * - receipt?: { name:string, mime:string, dataUrl:string } // ไฟล์ใบเสร็จ
 */
export function createTransaction(broker_id, payload) {
  const { type, amount, payment_method, note, receipt } = payload || {};
  const amt = Number(amount);

  if (!type || !["รายรับ", "รายจ่าย"].includes(type)) throw new Error("ประเภทไม่ถูกต้อง");
  if (!amt || amt <= 0) throw new Error("จำนวนเงินไม่ถูกต้อง");

  const rec = {
    id: uuid(),
    broker_id: broker_id ?? null,
    type,
    amount: amt,
    payment_method: payment_method || "เงินสด", // รวม "ผ่อนชำระ"
    note: String(note || ""),
    receipt: receipt && receipt.dataUrl ? {
      name: receipt.name,
      mime: receipt.mime,
      dataUrl: receipt.dataUrl, // สำหรับดาวน์โหลด
    } : null,
    status: "รอการตรวจสอบ",
    created_at: new Date().toISOString(),
    updated_at: null,
  };

  const all = load();
  all.unshift(rec);
  save(all);
  return rec;
}

export function listBrokerTransactions(broker_id) {
  const all = load();
  return all.filter((x) => String(x.broker_id) === String(broker_id));
}
export function listAllTransactions() {
  return load();
}

export function approveTransaction(id) {
  const all = load();
  const i = all.findIndex((x) => x.id === id);
  if (i === -1) throw new Error("ไม่พบรายการ");
  all[i].status = "อนุมัติ";
  all[i].updated_at = new Date().toISOString();
  save(all);
  return all[i];
}
export function rejectTransaction(id) {
  const all = load();
  const i = all.findIndex((x) => x.id === id);
  if (i === -1) throw new Error("ไม่พบรายการ");
  all[i].status = "ปฏิเสธ";
  all[i].updated_at = new Date().toISOString();
  save(all);
  return all[i];
}

export function summarizeAll() {
  const all = load();
  const res = {
    total: all.length,
    byStatus: {},
    incomeApproved: 0,
    expenseApproved: 0,
  };
  for (const r of all) {
    res.byStatus[r.status] = (res.byStatus[r.status] || 0) + 1;
    if (r.status === "อนุมัติ") {
      if (r.type === "รายรับ") res.incomeApproved += r.amount;
      if (r.type === "รายจ่าย") res.expenseApproved += r.amount;
    }
  }
  return res;
}
