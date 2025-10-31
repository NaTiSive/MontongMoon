// src/api/trees.js
import { apiGet, apiPatch } from "./client";

// ใช้ในหน้า: BrokerReportProblem, BrokerActivity
export async function listTrees() {
  const rows = await apiGet("/trees");
  return rows.map((t) => ({
    id: t.id,
    name: t.name || `ต้นที่ ${t.id}`,
    status: t.status || "ปกติ",
  }));
}

// ให้คงฟังก์ชันไว้เพื่อไม่ให้หน้าเดิมพัง (ไม่มีผลเมื่อใช้ backend จริง)
export function seedTreesIfEmpty() {
  /* no-op: ทำ seed ในระดับ DB (prisma/seed.js) แทน */
}

// อัปเดตสถานะต้นไม้ (ใช้ใน BrokerActivity)
export async function updateTreeStatus(tree_id, status) {
  return apiPatch(`/trees/${tree_id}/status`, { status });
}
