// src/api/fruits.js
import { apiGet, apiPost } from "./client";

// Export รายชื่อเกรดให้ UI เดิมใช้เหมือนเดิม
export const GRADES = ["A", "B", "C", "ตกเกรด"]; // "ตกเกรด" = REJECT

function mapGradeToServer(g) {
  return g === "ตกเกรด" ? "REJECT" : g; // A/B/C/REJECT
}
function mapGradeFromServer(g) {
  return g === "REJECT" ? "ตกเกรด" : g;
}

// ✅ เพิ่มผลผลิตใหม่ (type = HARVEST)
export async function createHarvestFruitRecord({ broker_id, grade, weight_kg, note }) {
  const payload = {
    brokerId: String(broker_id),
    grade: mapGradeToServer(grade),
    amountKg: Number(weight_kg),
    note: note || "",
  };
  const rec = await apiPost("/fruits/harvest", payload);
  // map กลับให้เหมือน shape เดิมในตาราง
  return {
    id: rec.id,
    broker_id,
    grade: mapGradeFromServer(rec.grade),
    weight_kg: rec.amountKg,
    note: rec.note || "",
    harvest_at: rec.date, // ISO
    type: "เก็บเกี่ยว",
  };
}

// ✅ ดึงเฉพาะของ broker (เฉพาะ HARVEST)
export async function listFruitsByBrokerHarvestOnly(broker_id) {
  const rows = await apiGet(`/fruits?type=HARVEST&brokerId=${broker_id}`);
  return rows.map((r) => ({
    id: r.id,
    broker_id,
    grade: mapGradeFromServer(r.grade),
    weight_kg: r.amountKg,
    note: r.note || "",
    harvest_at: r.date,
    type: "เก็บเกี่ยว",
  }));
}

// ✅ ดึงตามช่วงวัน (เฉพาะ HARVEST)
export async function listFruitsByDateRangeHarvestOnly({ startISO, endISO }) {
  const qs = new URLSearchParams();
  qs.set("type", "HARVEST");
  if (startISO) qs.set("start", startISO);
  if (endISO) qs.set("end", endISO);
  const rows = await apiGet(`/fruits?${qs.toString()}`);
  return rows.map((r) => ({
    id: r.id,
    broker_id: r.brokerId,
    grade: mapGradeFromServer(r.grade),
    weight_kg: r.amountKg,
    note: r.note || "",
    harvest_at: r.date,
    type: "เก็บเกี่ยว",
  }));
}
