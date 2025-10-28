// src/api/contracts.js
// ==========================
// NOTE: ใช้ LocalStorage จำลอง API จริง (Mock Layer)
// TODO: เมื่อเชื่อม backend จริง ให้เปลี่ยนเป็น fetch() / axios()

const CONTRACTS_KEY = "mm:contracts@v1";
const BROKERS_KEY = "mm:brokers@v1";

// ─────────────────────────────
// 🔹 Util: random UUID v4 (mock)
// ─────────────────────────────
function uuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ─────────────────────────────
// 🔹 Mock: owner ตั้ง deadline
// ─────────────────────────────
export async function getOwnerDeadline() {
  // ภายหลังเปลี่ยนเป็น fetch('/api/deadline/current')
  return { current_deadline_date: new Date(Date.now() + 7 * 86400000).toISOString() };
}

// ─────────────────────────────
// 🔹 Mock: broker context summary
// ─────────────────────────────
export async function getBrokerSubmissionContext({ owner_id = 1, broker_id }) {
  // ภายหลังเปลี่ยนเป็น fetch(`/api/context/broker/${broker_id}`)
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

// ─────────────────────────────
// 🔹 Mock: สร้างสัญญาใหม่ (broker submit offer)
// ─────────────────────────────
export async function createContract({
  broker_id,
  owner_id = 1,
  qtt_estimate,
  offerprice,
  payment_term,
  note,
}) {
  const now = new Date().toISOString();
  const all = JSON.parse(localStorage.getItem(CONTRACTS_KEY) || "[]");

  const row = {
    contract_id: uuid(),
    broker_id,
    owner_id,
    status: "รอการพิจารณา",
    contract_date: now,
    contract_deadline: null,
    qtt_estimate: Number(qtt_estimate),
    offerprice: Number(offerprice),
    payment_term: String(payment_term),
    note: note || "",
  };

  all.push(row);
  localStorage.setItem(CONTRACTS_KEY, JSON.stringify(all));
  return row;
}

// ─────────────────────────────
// 🔹 อ่านรายการข้อเสนอ
// ─────────────────────────────
export function listContracts({ status } = {}) {
  const all = JSON.parse(localStorage.getItem(CONTRACTS_KEY) || "[]");
  return status ? all.filter((c) => c.status === status) : all;
}

// ─────────────────────────────
// 🔹 อ่านข้อเสนอเดียว
// ─────────────────────────────
export function getContractById(contract_id) {
  const all = JSON.parse(localStorage.getItem(CONTRACTS_KEY) || "[]");
  return all.find((c) => c.contract_id === contract_id) || null;
}

// ─────────────────────────────
// 🔹 Owner อนุมัติข้อเสนอ + broker ได้รับการอนุมัติ
// ─────────────────────────────
export function approveContractAndBroker(contract_id) {
  const all = JSON.parse(localStorage.getItem(CONTRACTS_KEY) || "[]");
  const idx = all.findIndex((c) => c.contract_id === contract_id);
  if (idx < 0) throw new Error("ไม่พบสัญญา");

  const broker_id = all[idx].broker_id;
  all[idx] = {
    ...all[idx],
    status: "ยอมรับ",
    approved_at: new Date().toISOString(),
  };
  localStorage.setItem(CONTRACTS_KEY, JSON.stringify(all));

  // อัปเดตสถานะ broker → approved
  const brokers = JSON.parse(localStorage.getItem(BROKERS_KEY) || "[]");
  const bIdx = brokers.findIndex((b) => b.broker_id === broker_id);
  if (bIdx >= 0) brokers[bIdx].approvalStatus = "approved";
  else brokers.push({ broker_id, approvalStatus: "approved" });
  localStorage.setItem(BROKERS_KEY, JSON.stringify(brokers));

  return all[idx];
}

// ─────────────────────────────
// 🔹 Owner ปฏิเสธข้อเสนอ
// ─────────────────────────────
export function rejectContract(contract_id, reason = "") {
  const all = JSON.parse(localStorage.getItem(CONTRACTS_KEY) || "[]");
  const idx = all.findIndex((c) => c.contract_id === contract_id);
  if (idx < 0) throw new Error("ไม่พบสัญญา");

  all[idx] = {
    ...all[idx],
    status: "ปฏิเสธ",
    rejected_at: new Date().toISOString(),
    reject_reason: reason,
  };
  localStorage.setItem(CONTRACTS_KEY, JSON.stringify(all));
  return all[idx];
}

// ─────────────────────────────
// 🔹 Broker login → ดึงสถานะล่าสุด
// ─────────────────────────────
export function getBrokerApproval(broker_id) {
  const brokers = JSON.parse(localStorage.getItem(BROKERS_KEY) || "[]");
  const found = brokers.find((b) => b.broker_id === broker_id);
  return found?.approvalStatus || "pending";
}

// ─────────────────────────────
// 🔹 ตรวจว่ามีข้อเสนอ active อยู่ในรอบนั้นไหม
// ─────────────────────────────
export function hasActiveOfferForCycle({ broker_id, cycle_deadline }) {
  const all = JSON.parse(localStorage.getItem(CONTRACTS_KEY) || "[]");
  const activeStatuses = new Set(["รอการพิจารณา", "ยอมรับ"]);

  return all.some((c) => {
    if (c.broker_id !== broker_id) return false;
    const sameCycle =
      !cycle_deadline ||
      !c.contract_deadline ||
      new Date(c.contract_deadline).getTime() ===
        new Date(cycle_deadline).getTime();
    return sameCycle && activeStatuses.has(c.status);
  });
}
