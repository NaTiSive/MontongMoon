// src/api/accounts.js
import { apiGet, apiPost, apiUpload } from "./client";

// ดึงรายการของ Broker คนนี้
export async function listBrokerTransactions(broker_id) {
  const rows = await apiGet(`/accounts?brokerId=${broker_id}`);
  return rows.map((r) => ({
    id: r.id,
    type: r.type === "INCOME" ? "รายรับ" : "รายจ่าย",
    amount: Number(r.amount),
    payment_method:
      r.paymentMethod === "CASH" ? "เงินสด"
      : r.paymentMethod === "INSTALLMENT" ? "ผ่อนชำระ"
      : "โอนเงิน",
    status:
      r.status === "PENDING" ? "รอการตรวจสอบ"
      : r.status === "APPROVED" ? "อนุมัติ"
      : "ปฏิเสธ",
    receipt: r.receiptUrl ? { name: "receipt", dataUrl: r.receiptUrl } : null,
    note: r.note || "",
    created_at: r.createdAt,
  }));
}

// บันทึกรายการใหม่ (แนบไฟล์ได้)
export async function createTransaction(broker_id, { type, amount, payment_method, note, receipt }) {
  // 1) ถ้ามีไฟล์ ให้ upload ก่อนจะได้ url
  let receiptUrl = null;
  if (receipt?.dataUrl) {
    // ทาง backend อาจรับ dataURL ได้โดยตรง; ที่นี่สาธิตแบบส่งไฟล์จริง:
    // ถ้าคุณมี file object จริง ให้ใช้ apiUpload("/accounts/upload", file, { brokerId })
    // แต่ในหน้า BrokerTransaction เรามี dataUrl เท่านั้น — ส่งเป็น JSON เลย:
    const up = await apiPost("/accounts/receipt-dataurl", {
      brokerId: String(broker_id),
      name: receipt.name,
      dataUrl: receipt.dataUrl,
    });
    receiptUrl = up.url;
  }

  // 2) บันทึกธุรกรรม
  const payload = {
    brokerId: String(broker_id),
    type: type === "รายรับ" ? "INCOME" : "EXPENSE",
    amount: Number(amount),
    paymentMethod:
      payment_method === "เงินสด" ? "CASH"
      : payment_method === "ผ่อนชำระ" ? "INSTALLMENT"
      : "TRANSFER",
    note: note || "",
    receiptUrl,
  };
  return apiPost("/accounts", payload);
}
