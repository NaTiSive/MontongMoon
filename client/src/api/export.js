import { request } from "./http";
import { listBrokerContracts } from "./contracts";

export const GRADES = ["A", "B", "C", "ตกเกรด"];

export async function getAvailableStockByGrade({ broker_id = null } = {}) {
  const query = broker_id ? `?broker_id=${broker_id}` : "";
  const res = await request(`/export/stock${query}`);
  const stock = res?.stock || {};

  // ✅ ดึงค่าปริมาณจาก stock.<grade>.amount
  return {
    A: Number(stock?.A?.amount ?? 0),
    B: Number(stock?.B?.amount ?? 0),
    C: Number(stock?.C?.amount ?? 0),
  };
}

// --- ใส่เพิ่มใต้ getAvailableStockByGrade() ---
export async function getGradePricesByBroker(broker_id) {
  const query = broker_id ? `?broker_id=${broker_id}` : "";
  const res = await request(`/export/stock${query}`);
  const stock = res?.stock || {};
  return {
    A: Number(stock?.A?.price ?? 0),
    B: Number(stock?.B?.price ?? 0),
    C: Number(stock?.C?.price ?? 0),
  };
}

// ทางเลือก (ถ้าหน้า broker อยากได้พร้อมกันทั้ง amount+price+value)
export async function getBrokerStockWithPrices(broker_id) {
  const query = broker_id ? `?broker_id=${broker_id}` : "";
  const res = await request(`/export/stock${query}`);
  // คืนทั้งก้อน เช่น { A:{amount,price,value}, B:{...}, C:{...} }
  return res?.stock || { A:{}, B:{}, C:{} };
}



export async function submitExportRequest({ broker_id, grades }) {
  const res = await request("/export/requests", {
    method: "POST",
    body: { broker_id, grades },
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
