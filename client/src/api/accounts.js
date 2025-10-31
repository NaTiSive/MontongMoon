// src/api/accounts.js
// Mock ด้วย localStorage ให้หน้า UI ใช้งานได้ทันที
// ภายหลังค่อยสลับไปเรียก Backend /accounts แบบจริง

const KEY = "mm:accounts@v1";

// ---------- utils ----------
function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}
function save(arr) {
  localStorage.setItem(KEY, JSON.stringify(arr || []));
}
function uuid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ---------- สร้าง/แก้ไข ----------
/**
 * payload:
 * {
 *   broker_id?: string,
 *   type: "รายรับ" | "รายจ่าย",
 *   payment_method: "เงินสด" | "โอนเงิน" | "ผ่อนชำระ",
 *   amount: number,
 *   note?: string,
 *   receipt?: { dataUrl?: string, name?: string }
 * }
 */
export function createTransaction(payload) {
  const { broker_id = null, type, payment_method, amount, note = "", receipt = {} } = payload || {};
  if (!type || !["รายรับ", "รายจ่าย"].includes(type)) throw new Error("ประเภทธุรกรรมไม่ถูกต้อง");
  if (!payment_method || !["เงินสด", "โอนเงิน", "ผ่อนชำระ"].includes(payment_method))
    throw new Error("วิธีจ่ายไม่ถูกต้อง");
  const amt = Number(amount);
  if (!amt || isNaN(amt)) throw new Error("จำนวนเงินไม่ถูกต้อง");

  const rec = {
    id: uuid(),
    broker_id,
    type, // "รายรับ" | "รายจ่าย"
    payment_method,
    amount: amt,
    status: "รอการตรวจสอบ", // "รอการตรวจสอบ" | "อนุมัติ" | "ปฏิเสธ"
    receipt: receipt?.dataUrl ? { dataUrl: receipt.dataUrl, name: receipt.name || "receipt" } : null,
    note,
    created_at: new Date().toISOString(),
  };

  const all = load();
  all.unshift(rec);
  save(all);
  return rec;
}

export function updateTransaction(id, patch) {
  const all = load();
  const i = all.findIndex((x) => String(x.id) === String(id));
  if (i === -1) throw new Error("ไม่พบรายการ");
  all[i] = { ...all[i], ...patch };
  save(all);
  return all[i];
}

export function attachReceipt(id, { dataUrl, name }) {
  if (!dataUrl) throw new Error("ต้องมีไฟล์ใบเสร็จ");
  return updateTransaction(id, { receipt: { dataUrl, name: name || "receipt" } });
}

// ---------- อ่าน ----------
export function listAllTransactions() {
  return load();
}

export function listTransactionsByBroker(broker_id) {
  return load().filter((x) => String(x.broker_id) === String(broker_id));
}

export function getTransactionById(id) {
  return load().find((x) => String(x.id) === String(id)) || null;
}

// ---------- อนุมัติ/ปฏิเสธ ----------
export function approveTransaction(id) {
  return updateTransaction(id, { status: "อนุมัติ" });
}

export function rejectTransaction(id) {
  return updateTransaction(id, { status: "ปฏิเสธ" });
}

// ---------- สรุปยอด ----------
export function summarizeAll() {
  const all = load();
  const total = all.length;

  const byStatus = all.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});

  const incomeApproved = all
    .filter((r) => r.type === "รายรับ" && r.status === "อนุมัติ")
    .reduce((s, r) => s + Number(r.amount || 0), 0);

  const expenseApproved = all
    .filter((r) => r.type === "รายจ่าย" && r.status === "อนุมัติ")
    .reduce((s, r) => s + Number(r.amount || 0), 0);

  return { total, byStatus, incomeApproved, expenseApproved };
}

// ---------- dev helper ----------
export function __resetAccountsMock() {
  save([]);
}
