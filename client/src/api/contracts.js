// src/api/contracts.js
// เปลี่ยนเป็น fetch() เมื่อมี backend พร้อม
const CONTRACTS_KEY = "mm:contracts@v1";
const BROKERS_KEY   = "mm:brokers@v1";

export const PAYMENT_TERMS = ["เงินสด","โอนเงิน","ผ่อนชำระ","อื่นๆ"]; // ตรง enum DB

function uuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = (Math.random()*16)|0, v = c === "x" ? r : (r&0x3)|0x8;
    return v.toString(16);
  });
}

export async function getOwnerDeadline() {
  // mock 7 วันข้างหน้า
  return { current_deadline_date: new Date(Date.now() + 7*86400000).toISOString() };
}

export async function getBrokerSubmissionContext({ owner_id = 1, broker_id }) {
  // mock: แยกปัญหาออกจากสถานะต้น (ไม่มี "มีปัญหา" ใน enum ต้นแล้ว)
  const totalTrees = 128;
  const problemsOpen = 5;
  const byStatus = [
    { status: "ปกติ",  count: 90 },
    { status: "ออกดอก", count: 20 },
    { status: "ออกผล",  count: 13 },
  ];
  return { totalTrees, problemsOpen, byStatus };
}

export async function createContract({ broker_id, owner_id = 1, qtt_estimate, offerprice, payment_term, note }) {
  if (!PAYMENT_TERMS.includes(payment_term)) {
    throw new Error("payment_term ไม่ถูกต้อง");
  }
  const now = new Date().toISOString();
  const data = JSON.parse(localStorage.getItem(CONTRACTS_KEY) || "[]");
  const row = {
    contract_id: uuid(),
    broker_id,
    owner_id,
    status: "รอการพิจารณา",
    contract_date: now,
    contract_deadline: null, // เมื่อ Owner ตั้งรอบจริงค่อยใส่
    qtt_estimate: Number(qtt_estimate),
    offerprice: String(offerprice ?? ""),
    payment_term,
    note: note || ""
  };
  data.push(row);
  localStorage.setItem(CONTRACTS_KEY, JSON.stringify(data));
  return row;
}

export function listContracts() {
  return JSON.parse(localStorage.getItem(CONTRACTS_KEY) || "[]");
}

export function approveContract(contract_id) {
  const data = listContracts();
  const idx = data.findIndex(c => c.contract_id === contract_id);
  if (idx === -1) throw new Error("ไม่พบสัญญา");
  data[idx].status = "ยอมรับ"; // ใช้คำตาม enum DB
  localStorage.setItem(CONTRACTS_KEY, JSON.stringify(data));
  // เมื่อ owner ยอมรับ ให้ broker ได้สิทธิ์เต็มระบบ
  setBrokerApproval(data[idx].broker_id, "approved");
  return data[idx];
}

export function rejectContract(contract_id) {
  const data = listContracts();
  const idx = data.findIndex(c => c.contract_id === contract_id);
  if (idx === -1) throw new Error("ไม่พบสัญญา");
  data[idx].status = "ปฏิเสธ";
  localStorage.setItem(CONTRACTS_KEY, JSON.stringify(data));
  // ปฏิเสธ → สิทธิ์ยังคง pending
  setBrokerApproval(data[idx].broker_id, "pending");
  return data[idx];
}

// สิทธิ์ของ broker (ใช้ใน Login/Guard)
export function getBrokerApproval(broker_id) {
  const map = JSON.parse(localStorage.getItem(BROKERS_KEY) || "{}");
  // ดีฟอลต์ให้ "pending" ถ้าไม่เคยตั้ง
  return map[String(broker_id)] ?? "pending";
}
export function setBrokerApproval(broker_id, status /* 'approved' | 'pending' */) {
  const map = JSON.parse(localStorage.getItem(BROKERS_KEY) || "{}");
  map[String(broker_id)] = status;
  localStorage.setItem(BROKERS_KEY, JSON.stringify(map));
}

// utility: ห้าม broker ยื่นซ้ำในรอบเดียวกันเมื่อมีข้อเสนอ active
export function hasActiveOfferForCycle({ broker_id, cycle_deadline }) {
  const all = listContracts();
  const active = new Set(["รอการพิจารณา","ยอมรับ"]);
  return all.some(c => {
    if (c.broker_id !== broker_id) return false;
    const sameCycle =
      !cycle_deadline ||
      !c.contract_deadline ||
      new Date(c.contract_deadline).getTime() === new Date(cycle_deadline).getTime();
    return sameCycle && active.has(c.status);
  });
}
