import { request } from "./http";

export async function createProcessingRecord({ method, amountKg, note }) {
  const res = await request("/processing", {
    method: "POST",
    body: { method, amountKg, note },
  });
  return res?.data ?? res;
}
