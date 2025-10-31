// src/api/export.js
import { apiGet, apiPost, apiPatch } from "./client";

// สต็อกพร้อมส่งออกของ broker (ต่อเกรด)
export async function getAvailableStockByGrade({ broker_id }) {
  // server จะคำนวณจาก HARVEST - EXPORT - PROCESS (แยกเกรด A/B/C)
  const s = await apiGet(`/inventory/available-by-grade?brokerId=${broker_id}`);
  return { A: Number(s.A || 0), B: Number(s.B || 0), C: Number(s.C || 0) };
}

// ส่งคำขอส่งออก
export async function submitExportRequest({ broker_id, grades }) {
  // grades: {A,B,C}
  return apiPost("/export-requests", {
    brokerId: String(broker_id),
    grades,
  });
}

// ประวัติคำขอของฉัน
export async function listBrokerExportRequests(broker_id) {
  const rows = await apiGet(`/export-requests?brokerId=${broker_id}`);
  return rows.map((r) => ({
    id: r.id,
    broker_id: r.brokerId,
    grades: r.grades, // {A,B,C}
    status: r.status, // "รอการยืนยันจากเจ้าของสวน" | "ยืนยันแล้ว" | "ปฏิเสธแล้ว"
    created_at: r.createdAt,
  }));
}

// ยกเลิกคำขอ (ถ้ายัง pending)
export async function withdrawExportRequest({ req_id, broker_id }) {
  return apiPatch(`/export-requests/${req_id}/withdraw`, { brokerId: String(broker_id) });
}
