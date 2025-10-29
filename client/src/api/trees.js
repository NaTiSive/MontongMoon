// src/api/trees.js
// ──────────────────────────────────────────────
// ใช้เก็บข้อมูลต้นทุเรียนของสวนใน LocalStorage
// พร้อม alias field tree_id สำหรับความเข้ากันกับทุกหน้า
// ──────────────────────────────────────────────

const KEY = "mm:trees@v1";

// ── utility ───────────────────────────────────
function load() {
  return JSON.parse(localStorage.getItem(KEY) || "[]");
}
function save(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

// ── listTrees ─────────────────────────────────
// คืนข้อมูลต้นทั้งหมด พร้อม field tree_id = id
export function listTrees() {
  return load().map((t) => ({
    ...t,
    tree_id: t.tree_id || t.id, // เพิ่ม alias ให้แน่ใจว่าเข้ากันได้กับหน้าอื่น
  }));
}

// ── seedTreesIfEmpty ───────────────────────────
// ถ้ายังไม่มีข้อมูล ให้สร้างตัวอย่างไว้ก่อน
export function seedTreesIfEmpty() {
  if (load().length === 0) {
    const sample = [
      { id: "T001", name: "ต้นทุเรียน 1", status: "ปกติ" },
      { id: "T002", name: "ต้นทุเรียน 2", status: "ออกดอก" },
      { id: "T003", name: "ต้นทุเรียน 3", status: "ออกผล" },
      { id: "T004", name: "ต้นทุเรียน 4", status: "ปกติ" },
    ];
    save(sample);
  }
}

// ── updateTreeStatus ───────────────────────────
// อัปเดตสถานะต้นทุเรียนรายต้น
export function updateTreeStatus(tree_id, status) {
  const all = load();
  const t = all.find((x) => x.id === tree_id || x.tree_id === tree_id);
  if (!t) throw new Error("ไม่พบต้นไม้ที่ระบุ");
  t.status = status; // "ปกติ" | "ออกดอก" | "ออกผล"
  save(all);
  return t;
}
