import { request } from "./http";
import { listBrokerContracts } from "./contracts";

export const GRADES = ["A", "B", "C", "ตกเกรด"];

export async function getAvailableStockByGrade({ broker_id = null } = {}) {
  const query = broker_id ? `?broker_id=${broker_id}` : "";
  const res = await request(`/export/stock${query}`);
  const stock = res?.stock || {};
  return {
    A: Number(stock?.A?.amount ?? 0),
    B: Number(stock?.B?.amount ?? 0),
    C: Number(stock?.C?.amount ?? 0),
  };
}

// ✅ ส่งแบบเดิมที่ backend รอรับ
export async function submitExportRequest({ broker_id, grades }) {
  const body = {
    broker_id,
    grades: {
      A: Number(grades?.A ?? 0),
      B: Number(grades?.B ?? 0),
      C: Number(grades?.C ?? 0),
    },
  };
  const res = await request("/export/requests", {
    method: "POST",
    body,
  });
  return res?.data;
}

export async function listAllExportRequests() {
  const res = await request("/export/requests");
  return res?.data ?? [];
}

export async function listBrokerExportRequests(broker_id) {
  const res = await request(`/export/requests?broker_id=${broker_id ?? ""}`);
  return res?.data ?? [];
}

export async function withdrawExportRequest({ req_id }) {
  const res = await request(`/export/requests/${req_id}/withdraw`, { method: "POST" });
  return res?.data;
}

export async function ownerApproveExportRequest(req_id) {
  const res = await request(`/export/requests/${req_id}/approve`, { method: "POST" });
  return res?.data;
}

export async function ownerRejectExportRequest(req_id) {
  const res = await request(`/export/requests/${req_id}/reject`, { method: "POST" });
  return res?.data;
}

export async function getLatestAcceptedContractByBroker(broker_id) {
  const mine = await listBrokerContracts(broker_id);
  return mine
    .filter((c) => c.status === "ยอมรับ")
    .sort((a, b) => new Date(b.contract_date) - new Date(a.contract_date))[0] || null;
}

// ดึง "ราคา/กก." แยกตามเกรดของ broker
export async function getGradePricesByBroker(broker_id) {
  const query = broker_id ? `?broker_id=${broker_id}` : "";
  const res = await request(`/export/stock${query}`);
  const s = res?.stock || {};
  return {
    A: Number(s?.A?.price ?? 0),
    B: Number(s?.B?.price ?? 0),
    C: Number(s?.C?.price ?? 0),
  };
}

// ถ้าหน้าไหนอยากได้ทั้งจำนวน-ราคา-มูลค่าในครั้งเดียว ใช้อันนี้
export async function getBrokerStockWithPrices(broker_id) {
  const query = broker_id ? `?broker_id=${broker_id}` : "";
  const res = await request(`/export/stock${query}`);
  return res?.stock || { A: {}, B: {}, C: {} };
}

