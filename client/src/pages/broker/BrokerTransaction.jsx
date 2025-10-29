// src/pages/broker/BrokerTransaction.jsx
import React, { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";
import HeaderWrapper from "../../components/HeaderWrapper";
import Card from "../../components/Card";
import InputField from "../../components/InputField";
import SelectField from "../../components/SelectField";
import PrimaryButton from "../../components/PrimaryButton";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

import {
  createTransaction,
  listBrokerTransactions,
} from "../../api/accounts";

export default function BrokerTransaction() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (!user || user.role !== "broker") navigate("/login");
  }, [user, navigate]);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // ฟอร์มบันทึกรายการ
  const [form, setForm] = useState({
    type: "รายรับ",            // "รายรับ" | "รายจ่าย"
    amount: "",
    method: "เงินสด",          // "เงินสด" | "โอนเงิน" | "อื่นๆ"
    note: "",
    invoice_ref: "",
  });

  useEffect(() => {
    if (!user?.broker_id) return;
    try {
      setLoading(true);
      const mine = listBrokerTransactions(user.broker_id);
      setRows(mine || []);
    } catch (e) {
      setErr(e?.message || "โหลดรายการไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [user?.broker_id]);

  const onChange = (k) => (e) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const onSubmit = (e) => {
    e.preventDefault();
    try {
      const rec = createTransaction(user.broker_id, {
        type: form.type,
        amount: form.amount,
        payment_method: form.method,
        note: form.note,
        invoice_ref: form.invoice_ref,
      });
      setRows((r) => [rec, ...r]);
      setForm({
        type: "รายรับ",
        amount: "",
        method: "เงินสด",
        note: "",
        invoice_ref: "",
      });
      alert("บันทึกสำเร็จ (รอการตรวจสอบ)");
    } catch (err) {
      alert(err?.message || "บันทึกล้มเหลว");
    }
  };

  const fmtDT = (iso) =>
    iso
      ? new Date(iso).toLocaleString("th-TH", {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : "-";

  const chip = (status) => {
    const cls =
      status === "อนุมัติ"
        ? "bg-emerald-100 text-emerald-700"
        : status === "ปฏิเสธ"
        ? "bg-rose-100 text-rose-700"
        : "bg-amber-100 text-amber-700";
    return (
      <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${cls}`}>
        {status}
      </span>
    );
  };

  return (
    <div
      className={`min-h-screen w-full bg-slate-50 text-slate-900 flex flex-col md:flex-row ${
        isSidebarOpen ? "overflow-hidden md:overflow-auto" : ""
      }`}
    >
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <HeaderWrapper
          onMenuClick={() => setIsSidebarOpen(true)}
          title="ธุรกรรมของฉัน"
          subtitle="บันทึกรายรับ/รายจ่าย และติดตามสถานะการตรวจสอบ"
        />

        <main className="p-4 sm:p-6 pt-28">
          <div className="max-w-5xl mx-auto space-y-4">
            {/* ฟอร์มบันทึกธุรกรรม */}
            <Card>
              <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-6 gap-3">
                <div className="md:col-span-2">
                  <SelectField
                    label="ประเภท"
                    value={form.type}
                    onChange={onChange("type")}
                    options={["รายรับ", "รายจ่าย"]}
                  />
                </div>
                <div className="md:col-span-2">
                  <InputField
                    label="จำนวนเงิน (บาท)"
                    type="number"
                    value={form.amount}
                    onChange={onChange("amount")}
                    placeholder="เช่น 1500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm text-slate-600 mb-1">
                    วิธีชำระเงิน
                  </label>
                  <select
                    value={form.method}
                    onChange={onChange("method")}
                    className="w-full border rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    <option>เงินสด</option>
                    <option>โอนเงิน</option>
                    <option>อื่นๆ</option>
                  </select>
                </div>

                <div className="md:col-span-3">
                  <InputField
                    label="เลขที่ใบเสร็จ / อ้างอิง"
                    value={form.invoice_ref}
                    onChange={onChange("invoice_ref")}
                    placeholder="เช่น INV-2025-0001"
                  />
                </div>
                <div className="md:col-span-3">
                  <InputField
                    label="หมายเหตุ"
                    value={form.note}
                    onChange={onChange("note")}
                    placeholder="รายละเอียดเพิ่มเติม (ถ้ามี)"
                  />
                </div>

                <div className="md:col-span-6 flex justify-end">
                  <PrimaryButton title="บันทึก" type="submit" />
                </div>
              </form>
            </Card>

            {/* ตารางรายการของฉัน */}
            <Card>
              {loading ? (
                <div>กำลังโหลด…</div>
              ) : err ? (
                <div className="text-rose-600">{err}</div>
              ) : rows.length === 0 ? (
                <div className="text-sm text-slate-600">ยังไม่มีรายการ</div>
              ) : (
                <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left bg-slate-50 text-slate-600">
                        <th className="py-2 px-3">#</th>
                        <th className="py-2 px-3">ประเภท</th>
                        <th className="py-2 px-3">จำนวนเงิน</th>
                        <th className="py-2 px-3">วิธีชำระเงิน</th>
                        <th className="py-2 px-3">อ้างอิง</th>
                        <th className="py-2 px-3">สถานะ</th>
                        <th className="py-2 px-3">อัปเดตล่าสุด</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, i) => (
                        <tr
                          key={r.id}
                          className={i % 2 === 0 ? "bg-white" : "bg-slate-50/60"}
                        >
                          <td className="py-2 px-3">{r.id.slice(0, 8)}</td>
                          <td className="py-2 px-3">{r.type}</td>
                          <td className="py-2 px-3">{Number(r.amount).toLocaleString()}</td>
                          <td className="py-2 px-3">{r.payment_method}</td>
                          <td className="py-2 px-3">{r.invoice_ref || "-"}</td>
                          <td className="py-2 px-3">{chip(r.status)}</td>
                          <td className="py-2 px-3">{fmtDT(r.updated_at || r.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
