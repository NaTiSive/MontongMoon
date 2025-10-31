import { request } from "./http";

export async function getDowngradedStock() {
  const res = await request("/processing/stock");
  return res?.downgraded_stock ?? 0;
}

// แก้ไข: ลบ note ออกจาก parameter และ body
export async function createProcessingRecord({ method, amountKg }) {
  const res = await request("/processing", {
    method: "POST",
    body: { method, amountKg }, // <--- ลบ note ออก
  });
  return res?.data;
}