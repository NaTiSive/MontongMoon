// src/api/contracts.js
import { apiGet, apiPost } from "./client";

// Deadline ที่ Owner ตั้ง
export async function getOwnerDeadline() {
  // { current_deadline_date: ISO | null }
  return apiGet("/owner/deadline");
}

// Broker ส่งข้อเสนอ
export async function createContract({ broker_id, qtt_estimate, offerprice_by_grade, payment_term, note }) {
  return apiPost("/contracts", {
    brokerId: String(broker_id),
    qtyEstimateKg: Number(qtt_estimate),
    priceByGrade: offerprice_by_grade, // {A,B,C}
    paymentTerm: payment_term,
    note: note || "",
  });
}

// ใช้ใน BrokerDashboard: ดึงเฉพาะของฉัน
export async function listBrokerContracts(broker_id) {
  const rows = await apiGet(`/contracts?brokerId=${broker_id}`);
  return rows.map((c) => ({
    id: c.id,
    broker_id: c.brokerId,
    status: c.status, // "รอการพิจารณา" | "ยอมรับ" | "ปฏิเสธ"
    offerprice_by_grade: c.priceByGrade,
    created_at: c.createdAt,
  }));
}
