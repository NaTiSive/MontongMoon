// src/api/problems.js
import { request } from "./http";

/* ---------- Helpers ---------- */
function toThaiStatus(s = "") {
  const k = String(s || "").toLowerCase().replace(/\s/g, "");
  if (k === "open" || k === "เปิดปัญหา") return "เปิดปัญหา";
  if (
    k === "pending" ||
    k === "inprogress" ||
    k === "progress" ||
    k.includes("รอการแก้ไข") ||
    k.includes("ระหว่างแก้ไข") ||
    k.includes("รอดำเนินการ")
  ) {
    return "ระหว่างแก้ไข";
  }
  if (k === "resolved" || k === "done" || k === "closed" || k === "แก้ไขแล้ว" || k === "ปิด") {
    return "แก้ไขแล้ว";
  }
  return "เปิดปัญหา";
}

function parseTypeFromDesc(desc = "") {
  const s = String(desc);
  if (/^\[รายต้น\]/u.test(s)) return "รายต้น";
  if (/^\[ภาพรวม\]/u.test(s)) return "ภาพรวม";
  return "";
}

function toIsoOrNull(v) {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function normalizeRow(it = {}) {
  const id = it.id ?? it.problemId ?? it.problem_id ?? "";
  const tree_id = it.tree_id ?? it.treeId ?? null;
  const note_broker = it.note_broker ?? it.noteBroker ?? it.broker_note ?? "";
  const note_owner = it.note_owner ?? it.owner_note ?? it.ownerNote ?? "";
  const descBase = it.description ?? it.detail ?? note_broker ?? "";
  const description = descBase ?? "";
  const typeRaw = it.type ?? it.scope ?? parseTypeFromDesc(description);
  const type =
    typeRaw === "รายต้น" || typeRaw === "ภาพรวม"
      ? typeRaw
      : parseTypeFromDesc(description) || "";
  const statusRaw = it.status ?? it.state ?? "";
  const status = ["เปิดปัญหา", "ระหว่างแก้ไข", "แก้ไขแล้ว"].includes(statusRaw)
    ? statusRaw
    : toThaiStatus(statusRaw);
  const created_at = toIsoOrNull(it.created_at ?? it.createdAt);
  const updated_at = toIsoOrNull(it.updated_at ?? it.updatedAt);
  const broker_id = it.broker_id ?? it.brokerId ?? null;

  return {
    ...it,
    id,
    tree_id,
    type,
    description,
    detail: description,
    note_broker,
    note_owner,
    status,
    created_at,
    updated_at,
    broker_id,
  };
}

/* ---------- APIs ---------- */
export async function listProblems() {
  const res = await request("/problems");
  const rows = res?.data ?? [];
  return rows.map(normalizeRow);
}

export async function createProblem({ type, tree_id, note, description } = {}) {
  const finalType = type || "ภาพรวม"; // ✅ ตั้งค่า default ให้ภาพรวมได้เสมอ
  const payload = {
    type: finalType,
    tree_id: finalType === "รายต้น" ? tree_id || null : null,
    note_broker: note || "",
    description: description || note || "",
  };

  const res = await request("/problems", { method: "POST", body: payload });
  const d = res?.data ?? null;
  return d ? normalizeRow(d) : d;
}

export async function ownerAssignNoteAndSetPending(id, note) {
  const res = await request(`/problems/${id}/assign`, {
    method: "PATCH",
    body: { note },
  });
  const d = res?.data ?? null;
  return d ? normalizeRow(d) : d;
}

export async function brokerConfirmFixed(id) {
  const res = await request(`/problems/${id}/resolve`, { method: "PATCH" });
  const d = res?.data ?? null;
  return d ? normalizeRow(d) : d;
}

export async function ownerConfirmFixed(id) {
  const res = await request(`/problems/${id}/confirm`, { method: "PATCH" });
  const d = res?.data ?? null;
  return d ? normalizeRow(d) : d;
}
