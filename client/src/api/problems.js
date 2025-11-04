// src/api/problems.js
import { request } from "./http";

/* แปลงสถานะดิบ -> ไทยที่ UI ใช้ */
function toThaiStatus(s = "") {
  const k = String(s).toLowerCase();
  if (["open", "pending", "รอพบปัญหา", "เปิดปัญหา"].includes(k)) return "เปิดปัญหา";
  if (["inprogress", "progress", "ระหว่างแก้ไข"].includes(k)) return "ระหว่างแก้ไข";
  if (["resolved", "done", "แก้ไขแล้ว", "ปิด"].includes(k)) return "แก้ไขแล้ว";
  return s || "เปิดปัญหา";
}

/* รวม key ให้ตรง UI: id, tree_id, description, owner_note, status, created_at, updated_at */
function normalizeRow(it = {}) {
  const id = it.id ?? it.problemId ?? it.problem_id ?? "";
  const tree_id = it.tree_id ?? it.treeId ?? null;

  const note_broker = it.note_broker ?? it.noteBroker ?? "";
  const note_owner = it.note_owner ?? it.noteOwner ?? "";

  // คอลัมน์รายละเอียดอ่านจาก description/detail => ใช้ note_broker เป็นหลัก
  const descBase = it.description ?? it.detail ?? note_broker;
  const description = descBase ?? "";

  const statusRaw = it.status ?? it.state ?? "";
  const status = ["เปิดปัญหา", "ระหว่างแก้ไข", "แก้ไขแล้ว"].includes(statusRaw)
    ? statusRaw
    : toThaiStatus(statusRaw);

  const created_at =
    it.created_at ?? it.createdAt ?? null;
  const updated_at =
    it.updated_at ?? it.updatedAt ?? null;

  return {
    ...it,
    id,
    tree_id,
    note_broker,
    note_owner,
    description,
    detail: description,
    status,
    created_at,
    updated_at,
  };
}

export async function listProblems() {
  const res = await request("/problems");
  const rows = res?.data ?? [];
  return rows.map(normalizeRow);
}

export async function createProblem(body) {
  const res = await request("/problems", { method: "POST", body });
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
