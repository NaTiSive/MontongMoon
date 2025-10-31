// src/api/contracts.js
// Adapter สำหรับ Contracts: เรียก Backend ถ้ามี, fallback เป็น localStorage สำหรับบางส่วน
const API = import.meta.env.VITE_API_URL || "http://localhost:4000";
const TOKEN_KEY = "mm:token";

// ---- localStorage helpers ----
function getToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}
async function req(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { ...options, headers });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const t = await res.json();
      if (t?.error) msg = t.error;
    } catch {
      const t = await res.text();
      if (t) msg = t;
    }
    throw new Error(msg);
  }
  // บาง endpoint อาจไม่ส่ง body กลับมา
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// ---------- CONTRACTS (ใช้ Backend) ----------

// Broker ส่งข้อเสนอ
export async function createContract(payload) {
  // payload: { brokerId, qtyEstimateKg, priceByGrade:{A,B,C}, paymentTerm, note }
  const data = await req("/contracts", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return data;
}

// Owner/Broker ดึงรายการข้อเสนอ (Owner เห็นทั้งหมด / Broker ใส่ brokerId เป็นของตนเอง)
export async function listAllContracts(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const data = await req(`/contracts${qs ? `?${qs}` : ""}`, { method: "GET" });
  return Array.isArray(data) ? data : [];
}

// ดึงสัญญาแบบระบุ id (ถ้า backend ยังไม่ได้ทำ /contracts/:id ให้ดึงทั้งหมดแล้วหาเอา)
export async function getContractById(id) {
  const list = await listAllContracts();
  return list.find((c) => String(c.id) === String(id)) || null;
}

// Owner อนุมัติข้อเสนอ
export async function approveContract(id) {
  const data = await req(`/contracts/${id}/approve`, { method: "POST" });
  return data;
}

// Owner ปฏิเสธข้อเสนอ
export async function rejectContract(id) {
  const data = await req(`/contracts/${id}/reject`, { method: "POST" });
  return data;
}

// ---------- OWNER DEADLINE (mock ชั่วคราว; ภายหลังจะย้ายไปเรียก /owner/deadline) ----------
const OWNER_DEADLINE_KEY = "mm:owner-deadline@v1";

export function getOwnerDeadline() {
  try {
    return localStorage.getItem(OWNER_DEADLINE_KEY) || null;
  } catch {
    return null;
  }
}

export function setOwnerDeadline(newDate) {
  if (!newDate) throw new Error("ต้องระบุวันที่ Deadline");
  localStorage.setItem(OWNER_DEADLINE_KEY, newDate);
  return newDate;
}

// ---------- BROKER APPROVAL (mock ชั่วคราวให้โค้ดเก่ารันได้) ----------
const BROKER_APPROVAL_KEY = "mm:broker-approvals@v1";

// Owner เซ็ตสถานะอนุมัติ broker
export function setBrokerApproval(broker_id, status) {
  const map = JSON.parse(localStorage.getItem(BROKER_APPROVAL_KEY) || "{}");
  map[String(broker_id)] = status; // "pending" | "approved" | "rejected"
  localStorage.setItem(BROKER_APPROVAL_KEY, JSON.stringify(map));
  return map[String(broker_id)];
}

// Broker/ระบบ อ่านสถานะอนุมัติ
export function getBrokerApproval(broker_id) {
  const map = JSON.parse(localStorage.getItem(BROKER_APPROVAL_KEY) || "{}");
  return map[String(broker_id)] || "pending";
}

// alias เก่า (กันโค้ดเดิมพัง)
export const getBrokerApprovalStatus = getBrokerApproval;

// Broker: ดึงข้อเสนอของตนเอง
export async function listBrokerContracts(brokerId) {
  if (!brokerId) return [];
  return listAllContracts({ brokerId });
}

