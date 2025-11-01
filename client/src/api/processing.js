import { request } from "./http";

export async function getDowngradedStock() {
  const res = await request("/processing/stock");
  return Number(res?.downgraded_stock ?? res?.remaining ?? 0);
}

export async function createProcessingRecord({ method, amountKg, note }) {
  const res = await request("/processing", {
    method: "POST",
    body: { method, amountKg, note },
  });
  return res?.data ?? res;
}
