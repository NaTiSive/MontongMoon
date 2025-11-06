import { request } from "./http";

export const GRADES = ["A", "B", "C", "ตกเกรด"];

export async function createHarvestFruitRecord(payload) {
  const res = await request("/fruits/harvest", {
    method: "POST",
    body: {
      broker_id: payload?.broker_id,
      tree_id: payload?.tree_id,
      grade: payload?.grade,
      weight_kg: payload?.weight_kg,
    },
  });
  return res?.data;
}

export async function listFruits() {
  const res = await request("/fruits");
  return res?.data ?? [];
}

export async function listHarvestOnly({ tree_id, broker_id } = {}) {
  const params = new URLSearchParams();
  if (tree_id) params.append("tree_id", tree_id);
  if (broker_id) params.append("broker_id", broker_id);
  const query = params.toString();
  const res = await request(`/fruits/harvest${query ? `?${query}` : ""}`);
  return res?.data ?? [];
}

export async function listFruitsByDateRangeHarvestOnly({ startISO, endISO, broker_id, tree_id } = {}) {
  const params = new URLSearchParams();
  if (startISO) params.append("start", startISO);
  if (endISO) params.append("end", endISO);
  if (broker_id) params.append("broker_id", broker_id);
  if (tree_id) params.append("tree_id", tree_id);
  const query = params.toString();
  const res = await request(`/fruits/harvest${query ? `?${query}` : ""}`);
  return res?.data ?? [];
}

const EMPTY_SUMMARY = Object.freeze(
  Object.fromEntries(GRADES.map((grade) => [grade, 0]))
);

export async function getHarvestSummary({ startISO, endISO, broker_id, tree_id } = {}) {
  const params = new URLSearchParams();
  if (startISO) params.append("start", startISO);
  if (endISO) params.append("end", endISO);
  if (broker_id) params.append("broker_id", broker_id);
  if (tree_id) params.append("tree_id", tree_id);
  const query = params.toString();
  const res = await request(`/trees/harvest/summary${query ? `?${query}` : ""}`);
  const summary = res?.summary ?? {};
  const byGrade = { ...EMPTY_SUMMARY };
  if (summary.by_grade) {
    for (const [key, value] of Object.entries(summary.by_grade)) {
      byGrade[key] = Number(value) || 0;
    }
  }
  return {
    sum_weight: Number(summary.sum_weight) || 0,
    by_grade: byGrade,
  };
}

export async function listFruitsByBroker(broker_id) {
  const res = await request(`/fruits?broker_id=${broker_id ?? ""}`);
  return res?.data ?? [];
}

export async function listProcessedFruits() {
  const res = await request("/fruits?type=แปรรูป");
  return res?.data ?? [];
}

