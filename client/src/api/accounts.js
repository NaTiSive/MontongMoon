// src/api/accounts.js
import { request } from "./http";

export async function createTransaction(broker_id, payload) {
  const body = {
    broker_id,
    type: payload?.type,
    amount: Number(payload?.amount),
    payment_method: payload?.payment_method,
    note: payload?.note,
    // ✅ เปลี่ยน receipt → invoice_ref และรองรับ dataURL ของไฟล์แนบ
    invoice_ref:
      payload?.invoice_ref ??
      (payload?.receipt?.dataUrl || null),
  };

  const res = await request("/transactions", { method: "POST", body });
  return res?.data;
}

export async function listBrokerTransactions(broker_id) {
  const res = await request(`/transactions?broker_id=${broker_id ?? ""}`);
  return res?.data ?? [];
}

export async function listAllTransactions() {
  const res = await request("/transactions");
  return res?.data ?? [];
}

export async function approveTransaction(id) {
  const res = await request(`/transactions/${id}/approve`, { method: "PATCH" });
  return res?.data;
}

export async function rejectTransaction(id) {
  const res = await request(`/transactions/${id}/reject`, { method: "PATCH" });
  return res?.data;
}

export async function summarizeAll() {
  const res = await request("/transactions/summary/all");
  return res?.data ?? null;
}
