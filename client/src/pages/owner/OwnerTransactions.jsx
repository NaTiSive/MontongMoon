// src/pages/owner/OwnerTransactions.jsx
import React, { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";
import HeaderWrapper from "../../components/HeaderWrapper";
import Card from "../../components/Card";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

import {
  listAllTransactions,
  approveTransaction,
  rejectTransaction,
  summarizeAll,
} from "../../api/accounts";

export default function OwnerTransactions() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (!user || user.role !== "owner") navigate("/login");
  }, [user, navigate]);

  const [rows, setRows] = useState([]);
  const [sum, setSum] = useState({ total: 0, byStatus: {}, incomeApproved: 0, expenseApproved: 0 });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    try {
      setLoading(true);
      const all = listAllTransactions();
      setRows(all || []);
      setSum(summarizeAll());
    } catch (e) {
      setErr(e?.message || "โหลดรายการไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, []);

  const onApprove = (id) => {
    try {
      const rec = approveTransaction(id);
      setRows((r) => r.map((x) => (x.id === id ? rec : x)));
      setSum(summarizeAll());
    } catch (e) {
      alert(e?.message || "ไม่สามารถอนุมัติได้");
    }
  };

  const onReject = (id) => {
    try {
      const rec = rejectTransaction(id);
      setRows((r) => r.map((x) => (x.id === id ? rec : x)));
      setSum(summarizeAll());
    } catch (e) {
      alert(e?.message || "ไม่สามารถปฏิเสธได้");
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
          title="ธุรกรรมทั้งหมด"
          subtitle="ตรวจสอบ อนุมัติ หรือปฏิเสธรายการของผู้รับเหมา"
        />

        <main className="p-4 sm:p-6 pt-28">
          <div className="max-w-6xl mx-auto space-y-4">
            {/* การ์ดสรุปสั้น ๆ */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <div className="p-4">
                  <div className="text-sm text-slate-500">จำนวนทั้งหมด</div>
                  <div className="text-2xl font-semibold">{sum.total || 0}</div>
                </div>
              </Card>
              <Card>
                <div className="p-4">
                  <div className="text-sm text-slate-500">รอการตรวจสอบ</div>
                  <div className="text-2xl font-semibold">
                    {sum.byStatus?.["รอการตรวจสอบ"] || 0}
                  </div>
                </div>
              </Card>
              <Card>
                <div className="p-4">
                  <div className="text-sm text-slate-500">รายรับที่อนุมัติ (บาท)</div>
                  <div className="text-2xl font-semibold">
                    {Number(sum.incomeApproved || 0).toLocaleString()}
                  </div>
                </div>
              </Card>
              <Card>
                <div className="p-4">
                  <div className="text-sm text-slate-500">รายจ่ายที่อนุมัติ (บาท)</div>
                  <div className="text-2xl font-semibold">
                    {Number(sum.expenseApproved || 0).toLocaleString()}
                  </div>
                </div>
              </Card>
            </div>

            {/* ตารางทั้งหมด */}
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
                        <th className="py-2 px-3">Broker</th>
                        <th className="py-2 px-3">ประเภท</th>
                        <th className="py-2 px-3">จำนวนเงิน</th>
                        <th className="py-2 px-3">วิธีชำระเงิน</th>
                        <th className="py-2 px-3">อ้างอิง</th>
                        <th className="py-2 px-3">สถานะ</th>
                        <th className="py-2 px-3">อัปเดตล่าสุด</th>
                        <th className="py-2 px-3">การกระทำ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, i) => (
                        <tr
                          key={r.id}
                          className={i % 2 === 0 ? "bg-white" : "bg-slate-50/60"}
                        >
                          <td className="py-2 px-3">{r.id.slice(0, 8)}</td>
                          <td className="py-2 px-3">{r.broker_id ?? "-"}</td>
                          <td className="py-2 px-3">{r.type}</td>
                          <td className="py-2 px-3">{Number(r.amount).toLocaleString()}</td>
                          <td className="py-2 px-3">{r.payment_method}</td>
                          <td className="py-2 px-3">{r.invoice_ref || "-"}</td>
                          <td className="py-2 px-3">{chip(r.status)}</td>
                          <td className="py-2 px-3">{fmtDT(r.updated_at || r.created_at)}</td>
                          <td className="py-2 px-3">
                            {r.status === "รอการตรวจสอบ" ? (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => onApprove(r.id)}
                                  className="px-3 py-1 rounded-lg text-white text-xs bg-emerald-700 hover:bg-emerald-800"
                                >
                                  อนุมัติ
                                </button>
                                <button
                                  onClick={() => onReject(r.id)}
                                  className="px-3 py-1 rounded-lg text-white text-xs bg-rose-600 hover:bg-rose-700"
                                >
                                  ปฏิเสธ
                                </button>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-xs">—</span>
                            )}
                          </td>
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
