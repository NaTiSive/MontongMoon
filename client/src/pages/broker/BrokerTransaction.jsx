// src/pages/broker/BrokerTransaction.jsx
import React, { useState } from "react";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import Card from "../../components/Card";

export default function BrokerTransaction() {
  const [form, setForm] = useState({
    kind: "รายรับ",          // รายรับ | รายจ่าย
    method: "เงินสด",        // เงินสด | โอนเงิน | เช็ค
    ref: "",                 // เลขอ้างอิงใบเสร็จ
    amount: "",             // จำนวนเงิน (บาท)
    note: "",               // หมายเหตุ
  });

  const [items, setItems] = useState([
    { id: "TX-001", kind: "รายรับ", method: "โอนเงิน", ref: "INV-2025-001", amount: 10850, note: "ขายผลผลิต", at: "2025-10-03T11:46:09" },
  ]);

  const onChange = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const fmt = (n) => n.toLocaleString("th-TH", { style: "currency", currency: "THB" });
  const fmtDT = (iso) =>
    new Date(iso).toLocaleString("th-TH", { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });

  const submit = (e) => {
    e.preventDefault();
    const amt = Number(form.amount);
    if (!amt || amt <= 0) return alert("กรุณากรอกจำนวนเงินเป็นตัวเลขมากกว่า 0");
    if (!form.ref.trim()) return alert("กรุณากรอกเลขอ้างอิงใบเสร็จ");

    const rec = {
      id: `TX-${String(items.length + 1).padStart(3, "0")}`,
      kind: form.kind,
      method: form.method,
      ref: form.ref.trim(),
      amount: amt,
      note: form.note.trim() || "-",
      at: new Date().toISOString(),
    };
    setItems((prev) => [rec, ...prev]);
    setForm({ kind: "รายรับ", method: "เงินสด", ref: "", amount: "", note: "" });
    alert("ส่งรายงานให้เจ้าของสวนเรียบร้อย");
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-900 flex">
      {/* Sidebar */}
      <div className="hidden md:block w-56 lg:w-64 shrink-0 sticky top-0 h-screen bg-white shadow-md">
        <Sidebar />
      </div>

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        <Header
          title="บันทึกรายรับ / รายจ่าย"
          subtitle="แจ้งรายละเอียดรายการเพื่อให้เจ้าของสวนติดตามได้อย่างรวดเร็ว"
          name="สมชาย เข้มแข็ง"
          role="เจ้าของสวน"
        />

        <main className="p-4 sm:p-6 pt-28">
          <div className="max-w-4xl mx-auto space-y-6">
            <Card>
              <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* ซ้าย */}
                <div>
                  <label className="block text-sm text-slate-600 mb-1">ประเภทรายการ</label>
                  <select
                    value={form.kind}
                    onChange={onChange("kind")}
                    className="w-full border rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    <option>รายรับ</option>
                    <option>รายจ่าย</option>
                  </select>
                </div>

                {/* ขวา */}
                <div>
                  <label className="block text-sm text-slate-600 mb-1">วิธีการจ่าย / รับเงิน</label>
                  <select
                    value={form.method}
                    onChange={onChange("method")}
                    className="w-full border rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    <option>เงินสด</option>
                    <option>โอนเงิน</option>
                    <option>เช็ค</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-slate-600 mb-1">เลขอ้างอิงใบเสร็จ</label>
                  <input
                    value={form.ref}
                    onChange={onChange("ref")}
                    placeholder="เช่น INV-2025-001"
                    className="w-full border rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-600 mb-1">จำนวนเงิน (บาท)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.amount}
                    onChange={onChange("amount")}
                    placeholder="เช่น 108.00"
                    className="w-full border rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm text-slate-600 mb-1">หมายเหตุ</label>
                  <textarea
                    rows={5}
                    value={form.note}
                    onChange={onChange("note")}
                    placeholder="รายละเอียด เช่น ซื้อปุ๋ย ค่แรง ขายผลผลิต ฯลฯ"
                    className="w-full border rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-emerald-700 text-white text-sm hover:bg-emerald-800"
                  >
                    ส่งรายงานให้เจ้าของสวน
                  </button>
                </div>
              </form>
            </Card>

            {/* รายการล่าสุด (ตัวอย่าง) */}
            <Card>
              <h3 className="font-semibold text-slate-800 mb-2">รายการล่าสุด</h3>
              <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left bg-slate-50 text-slate-600">
                      <th className="py-2 px-3">เวลาบันทึก</th>
                      <th className="py-2 px-3">ประเภท</th>
                      <th className="py-2 px-3">วิธีชำระ/รับเงิน</th>
                      <th className="py-2 px-3">เลขอ้างอิง</th>
                      <th className="py-2 px-3">จำนวนเงิน</th>
                      <th className="py-2 px-3">หมายเหตุ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((r, i) => (
                      <tr key={r.id} className={i % 2 ? "bg-slate-50/60" : "bg-white"}>
                        <td className="py-2 px-3">{fmtDT(r.at)}</td>
                        <td className="py-2 px-3">{r.kind}</td>
                        <td className="py-2 px-3">{r.method}</td>
                        <td className="py-2 px-3">{r.ref}</td>
                        <td className="py-2 px-3">{fmt(r.amount)}</td>
                        <td className="py-2 px-3">{r.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
