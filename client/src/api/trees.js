// src/api/trees.js
const KEY = "mm:trees@v1";

function load() {
  return JSON.parse(localStorage.getItem(KEY) || "[]");
}
function save(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function listTrees() {
  return load();
}

export function seedTreesIfEmpty() {
  if (load().length === 0) {
    const sample = [
      { id: "T001", name: "ต้นทุเรียน 1", status: "ปกติ" },
      { id: "T002", name: "ต้นทุเรียน 2", status: "ออกดอก" },
      { id: "T003", name: "ต้นทุเรียน 3", status: "ออกผล" },
    ];
    save(sample);
  }
}

export function updateTreeStatus(tree_id, status) {
  const all = load();
  const t = all.find((x) => x.id === tree_id);
  if (!t) throw new Error("ไม่พบต้นไม้");
  t.status = status; // "ปกติ" | "ออกดอก" | "ออกผล"
  save(all);
  return t;
}
