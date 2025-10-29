// src/api/problems.js
const KEY = "mm:problems@v1";

function load() {
  return JSON.parse(localStorage.getItem(KEY) || "[]");
}
function save(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function listProblems() {
  return load().sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

export function createProblem({ broker_id, tree_id, type, note_broker }) {
  const all = load();
  const problem = {
    id: crypto.randomUUID(),
    broker_id,
    tree_id: tree_id || null,
    type,
    note_broker,                 // ✅ เก็บข้อความจาก broker
    status: "เปิดปัญหา",
    created_at: new Date().toISOString(),
    updated_at: null,
    owner_note: "",
  };
  all.push(problem);
  save(all);
  return problem;
}

// Owner: มอบหมาย / บันทึกโน้ต / ตั้งสถานะเป็น "ระหว่างแก้ไข"
export function ownerAssignNoteAndSetPending(id, note) {
  const all = load();
  const p = all.find((x) => x.id === id);
  if (!p) throw new Error("ไม่พบปัญหา");
  p.owner_note = note;
  p.status = "ระหว่างแก้ไข";
  p.updated_at = new Date().toISOString();
  save(all);
  return p;
}

// Broker: ยืนยันว่าแก้ไขเสร็จแล้ว
export function brokerConfirmFixed(id) {
  const all = load();
  const p = all.find((x) => x.id === id);
  if (!p) throw new Error("ไม่พบปัญหา");
  p.status = "แก้ไขแล้ว";
  p.updated_at = new Date().toISOString();
  save(all);
  return p;
}
