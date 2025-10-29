// src/api/fruits.js
const KEY = "mm:fruits@v1";

// เกรดตัวอย่าง (ปรับได้ตามจริง)
export const GRADES = ["A", "B", "C", "ตกเกรด"];

function load() {
  return JSON.parse(localStorage.getItem(KEY) || "[]");
}
function save(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function listFruits() {
  return load().sort((a, b) => new Date(b.harvest_at) - new Date(a.harvest_at));
}

export function listFruitsByBroker(broker_id) {
  return listFruits().filter((r) => r.broker_id === broker_id);
}

export function listFruitsByDateRange({ startISO, endISO }) {
  const all = listFruits();
  const s = startISO ? new Date(startISO).getTime() : null;
  const e = endISO ? new Date(endISO).getTime() : null;
  return all.filter((r) => {
    const t = new Date(r.harvest_at).getTime();
    if (s && t < s) return false;
    if (e && t > e) return false;
    return true;
  });
}

/**
 * สร้างบันทึกผลเก็บเกี่ยวแบบเป็น “ผล/เกรด”
 * @param {Object} payload
 * @param {string|number} payload.broker_id
 * @param {string} payload.tree_id
 * @param {string} payload.grade     - หนึ่งใน GRADES
 * @param {number} payload.weight_kg - น้ำหนักรวม (กก.)
 * @param {number} payload.count     - จำนวนผล
 * @param {string} [payload.note]    - หมายเหตุ
 * @param {string} [payload.harvest_at] - ISO datetime (ถ้าไม่ส่ง จะใช้เวลาปัจจุบัน)
 */
export function createHarvestFruitRecord({
  broker_id,
  tree_id,
  grade,
  weight_kg,
  count,
  note = "",
  harvest_at,
}) {
  if (!GRADES.includes(grade)) throw new Error("เกรดไม่ถูกต้อง");
  const w = Number(weight_kg);
  const c = Number(count);
  if (!Number.isFinite(w) || w <= 0) throw new Error("น้ำหนัก (กก.) ต้องเป็นตัวเลขบวก");
  if (!Number.isFinite(c) || c <= 0) throw new Error("จำนวนผล ต้องเป็นตัวเลขบวก");

  const rows = load();
  const rec = {
    id: crypto.randomUUID(),
    broker_id,
    tree_id,
    grade,
    weight_kg: w,
    count: c,
    note: String(note || ""),
    harvest_at: harvest_at || new Date().toISOString(),
  };
  rows.push(rec);
  save(rows);
  return rec;
}
