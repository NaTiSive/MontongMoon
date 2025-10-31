import { request } from "./http";

export const GRADES = ["A", "B", "C", "ตกเกรด"];

export async function createHarvestFruitRecord(payload) {
  const res = await request("/fruits/harvest", {
    method: "POST",
    body: {
      broker_id: payload?.broker_id,
      grade: payload?.grade,
      weight_kg: payload?.weight_kg,
      note: payload?.note,
    },
  });
  return res?.data;
}

export async function listFruits() {
  const res = await request("/fruits");
  return res?.data ?? [];
}

export async function listHarvestOnly() {
  const res = await request("/fruits/harvest");
  return res?.data ?? [];
}

export async function listFruitsByBrokerHarvestOnly(broker_id) {
  const res = await request(`/fruits/harvest?broker_id=${broker_id ?? ""}`);
  return res?.data ?? [];
}

export async function listFruitsByDateRangeHarvestOnly({ startISO, endISO } = {}) {
  const params = new URLSearchParams();
  if (startISO) params.append("start", startISO);
  if (endISO) params.append("end", endISO);
  const query = params.toString();
  const res = await request(`/fruits/harvest${query ? `?${query}` : ""}`);
  return res?.data ?? [];
}

export async function listFruitsByBroker(broker_id) {
  const res = await request(`/fruits?broker_id=${broker_id ?? ""}`);
  return res?.data ?? [];
}

export async function listProcessedFruits() {
  const res = await request("/fruits?type=แปรรูป");
  return res?.data ?? [];
}
