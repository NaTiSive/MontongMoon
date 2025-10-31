// src/api/problems.js
import { apiGet, apiPost, apiPatch } from "./client";

// สร้างปัญหาใหม่ (UC3)
export async function createProblem({ broker_id, tree_id, description }) {
  return apiPost("/problems", {
    brokerId: String(broker_id),
    treeId: tree_id ? String(tree_id) : null,
    description,
  });
}

// ดึงปัญหาทั้งหมด (owner จะเห็นทั้งหมด / broker จะกรองเองในหน้า)
export async function listProblems() {
  const rows = await apiGet("/problems");
  return rows.map((r) => ({
    id: r.id,
    broker_id: r.brokerId,
    tree_id: r.treeId,
    description: r.description,
    status: r.status, // "เปิดปัญหา" | "ระหว่างแก้ไข" | "แก้ไขแล้ว"
    owner_note: r.ownerNote || "",
    created_at: r.createdAt,
    updated_at: r.updatedAt,
  }));
}

// นายหน้ายืนยันว่า "แก้ไขแล้ว" (UC5)
export async function brokerConfirmFixed(id) {
  return apiPatch(`/problems/${id}/confirm-fixed`, {});
}
