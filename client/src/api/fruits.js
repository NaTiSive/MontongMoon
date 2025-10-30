// src/api/fruits.js
const KEY = "mm:fruits@v1";

// ✅ export รายชื่อเกรดมาตรฐาน (ให้ Owner/Broker ใช้ได้ทุกหน้า)
export const GRADES = ["A", "B", "C", "ตกเกรด"];

// ---------- utils ----------
function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

function save(arr) {
  localStorage.setItem(KEY, JSON.stringify(arr));
}

function uuid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID)
    return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ---------- CRUD ----------

// ✅ บันทึกผลผลิต (type: เก็บเกี่ยว)
export function createHarvestFruitRecord(payload) {
  const { broker_id, grade, weight_kg, note } = payload || {};
  const w = Number(weight_kg);
  if (!grade || !GRADES.includes(grade)) throw new Error("เกรดไม่ถูกต้อง");
  if (!w || w <= 0) throw new Error("น้ำหนักต้องมากกว่า 0");

  const rec = {
    id: uuid(),
    broker_id: broker_id ?? null,
    grade,
    weight_kg: w,
    note: note || "",
    harvest_at: new Date().toISOString(),
    type: "เก็บเกี่ยว", // ✅ แยกชนิดเก็บเกี่ยวกับส่งออก
  };

  const all = load();
  all.unshift(rec);
  save(all);
  return rec;
}

// ✅ ดึงทั้งหมด
export function listFruits() {
  return load();
}

// ✅ ดึงเฉพาะเก็บเกี่ยว
export function listHarvestOnly() {
  return load().filter((r) => r.type !== "ส่งออก");
}

// ✅ ดึงเฉพาะ broker ที่เก็บเกี่ยว
export function listFruitsByBrokerHarvestOnly(broker_id) {
  return load().filter(
    (r) => String(r.broker_id) === String(broker_id) && r.type !== "ส่งออก"
  );
}

// ✅ ดึงเฉพาะช่วงเวลา (เก็บเกี่ยวเท่านั้น)
export function listFruitsByDateRangeHarvestOnly({ startISO, endISO } = {}) {
  let list = load().filter((r) => r.type !== "ส่งออก");
  if (startISO)
    list = list.filter((x) => new Date(x.harvest_at) >= new Date(startISO));
  if (endISO)
    list = list.filter((x) => new Date(x.harvest_at) <= new Date(endISO));
  return list;
}

// ✅ ฟังก์ชันอื่น ๆ (ใช้ได้กับทั้งเก็บเกี่ยวและส่งออก)
export function listFruitsByBroker(broker_id) {
  return load().filter((x) => String(x.broker_id) === String(broker_id));
}
