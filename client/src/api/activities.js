// src/api/activities.js
const KEY = "mm:activities@v1";

function load() {
  return JSON.parse(localStorage.getItem(KEY) || "[]");
}
function save(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function listActivitiesByBroker(broker_id) {
  return load().filter((a) => a.broker_id === broker_id);
}

export function listActivitiesForOwner() {
  return load();
}

export function createActivity({ broker_id, tree_id, type, note }) {
  const all = load();
  const act = {
    id: crypto.randomUUID(),
    broker_id,
    tree_id,
    type, // เช่น "รดน้ำ", "ใส่ปุ๋ย", "ตัดหญ้า"
    note,
    created_at: new Date().toISOString(),
  };
  all.push(act);
  save(all);
  return act;
}
