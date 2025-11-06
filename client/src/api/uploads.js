import { getStoredAuth } from "./http";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

export async function uploadInvoice(file, tokenFromCaller) {
  const fd = new FormData();
  fd.append("invoice", file);

  // ✅ ดึง token จาก storage กลางของระบบ auth
  let token = tokenFromCaller || null;
  if (!token) {
    token = getStoredAuth()?.token || null;
  }

  const res = await fetch(`${BASE}/upload/invoice`, {
    method: "POST",
    body: fd,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    // ❌ ไม่ต้องใส่ credentials: "include" เพราะเราใช้ JWT Bearer แทนคุกกี้
  });

  if (!res.ok) {
    let msg = `Upload failed (HTTP ${res.status})`;
    try {
      const j = await res.json();
      if (j?.message) msg = `${msg} - ${j.message}`;
    } catch {}
    throw new Error(msg);
  }

  const data = await res.json();
  return data?.url; // เช่น "/static/invoices/uuid.pdf"
}
