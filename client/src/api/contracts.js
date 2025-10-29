// src/api/contracts.js
// Mock API บน LocalStorage (เปลี่ยนเป็น fetch() เมื่อมี backend)

const CONTRACTS_KEY = "mm:contracts@v1";
const BROKER_APPROVAL_KEY = "mm:broker-approvals@v1";
const OWNER_DEADLINE_KEY = "mm:owner-deadline@v1";

// ---------- utils ----------
function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : (fallback ?? null);
  } catch {
    return fallback ?? null;
  }
}
function save(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}
function uuid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0,
      v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ---------- owner settings ----------
export async function getOwnerDeadline() {
  let iso = load(OWNER_DEADLINE_KEY, null);
  if (!iso) {
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    iso = new Date(Date.now() + sevenDays).toISOString();
    save(OWNER_DEADLINE_KEY, iso);
  }
  return { current_deadline_date: iso };
}

export async function setOwnerDeadline(newISO) {
  if (!newISO) throw new Error("ต้องระบุวันที่ปิดรับข้อเสนอ");
  const d = new Date(newISO);
  if (isNaN(d.getTime())) throw new Error("รูปแบบวันที่ไม่ถูกต้อง");
  save(OWNER_DEADLINE_KEY, d.toISOString());
  return { current_deadline_date: d.toISOString() };
}

// ---------- broker submission context (mock) ----------
export async function getBrokerSubmissionContext({ owner_id = 1, broker_id }) {
  const totalTrees = 128;
  const problemsOpen = 5;
  const byStatus = [
    { status: "ปกติ", count: 90 },
    { status: "ออกดอก", count: 20 },
    { status: "ออกผล", count: 13 },
    { status: "มีปัญหา", count: 5 },
  ];
  return { totalTrees, problemsOpen, byStatus };
}

// ---------- contracts ----------
export async function createContract({
  broker_id,
  owner_id = 1,
  qtt_estimate,
  offerprice_by_grade, // ต้องเป็น {A,B,C}
  payment_term,
  note,
}) {
  const qty = Number(qtt_estimate);
  if (!Number.isFinite(qty) || qty <= 0) {
    throw new Error("ปริมาณต้องเป็นตัวเลขบวก");
  }

  if (!offerprice_by_grade || typeof offerprice_by_grade !== "object") {
    throw new Error("ต้องระบุราคาตามเกรด (A,B,C)");
  }

  const A = Number(offerprice_by_grade.A);
  const B = Number(offerprice_by_grade.B);
  const C = Number(offerprice_by_grade.C);
  if (![A, B, C].every((n) => Number.isFinite(n) && n > 0)) {
    throw new Error("ราคาตามเกรด A,B,C ต้องเป็นตัวเลขบวกทั้งหมด");
  }

  const now = new Date().toISOString();
  const all = load(CONTRACTS_KEY, []) || [];

  const row = {
    contract_id: uuid(),
    broker_id,
    owner_id,
    status: "รอการพิจารณา",
    contract_date: now,
    contract_deadline: null,
    qtt_estimate: qty,
    offerprice_by_grade: { A, B, C },
    offerprice: A, // ใช้ A เป็นตัวแทนราคาหลัก (เช่น sorting)
    payment_term: String(payment_term || ""),
    note: String(note || ""),
  };

  all.push(row);
  save(CONTRACTS_KEY, all);
  return row;
}

// ────────────────────────────────
// List / Filter / Approve / Reject
// ────────────────────────────────
export async function listAllContracts() {
  const all = load(CONTRACTS_KEY, []) || [];
  return all.sort((a, b) => new Date(b.contract_date) - new Date(a.contract_date));
}

export async function listBrokerContracts(broker_id) {
  const all = (await listAllContracts()) || [];
  return all.filter((c) => String(c.broker_id) === String(broker_id));
}

// ✅ Owner อนุมัติแบบ "exclusive" (อนุมัติได้ทีละ 1)
export async function approveContract(contract_id) {
  const all = load(CONTRACTS_KEY, []) || [];
  const i = all.findIndex((c) => c.contract_id === contract_id);
  if (i === -1) throw new Error("ไม่พบข้อเสนอ");

  // ยกเลิกการยอมรับอื่น ๆ ทั้งหมดก่อน
  for (let j = 0; j < all.length; j++) {
    if (all[j].status === "ยอมรับ") {
      all[j].status = "รอการพิจารณา";
    }
  }

  // ยอมรับข้อเสนอที่เลือก
  all[i].status = "ยอมรับ";
  save(CONTRACTS_KEY, all);

  if (all[i]?.broker_id != null) {
    setBrokerApproval(all[i].broker_id, "approved");
  }
  return all[i];
}

export async function rejectContract(contract_id) {
  const all = load(CONTRACTS_KEY, []) || [];
  const i = all.findIndex((c) => c.contract_id === contract_id);
  if (i === -1) throw new Error("ไม่พบข้อเสนอ");
  all[i].status = "ปฏิเสธ";
  save(CONTRACTS_KEY, all);
  return all[i];
}

// ✅ อนุญาตให้ broker ยื่นได้หลายรอบ (ปิดการตรวจ active)
export function hasActiveOfferForCycle() {
  return false;
}

// ---------- broker approval ----------
export function setBrokerApproval(broker_id, status) {
  const map = load(BROKER_APPROVAL_KEY, {}) || {};
  map[String(broker_id)] = status;
  save(BROKER_APPROVAL_KEY, map);
  return map[String(broker_id)];
}

export function getBrokerApproval(broker_id) {
  const map = load(BROKER_APPROVAL_KEY, {}) || {};
  return map[String(broker_id)] || "pending";
}

// 🔁 alias สำหรับโค้ดเดิม
export const getBrokerApprovalStatus = getBrokerApproval;
