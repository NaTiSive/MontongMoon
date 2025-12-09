import React, { useEffect, useMemo, useState } from "react";
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
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [summary, setSummary] = useState(null);

  const reload = async () => {
    try {
      const all = await listAllTransactions();
      setRows(
        all.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      );
      const sum = await summarizeAll();
      setSummary(sum);
      setErr("");
    } catch (e) {
      setErr(e?.message || "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    reload();
  }, []);

  const fmt = (iso) =>
    new Date(iso).toLocaleString("th-TH", {
      dateStyle: "medium",
      timeStyle: "short",
    });

  // ช่วยประกอบ URL ให้ชี้ไปที่ backend เสมอ
  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000/api";
  const SERVER_ORIGIN = API_BASE.replace(/\/api\/?$/, "");
  const toFileUrl = (u) => (u?.startsWith("/static") ? SERVER_ORIGIN + u : u);

  // กรอง/ค้นหา
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState("ทั้งหมด");
  const [methodFilter, setMethodFilter] = useState("ทั้งหมด");
  const [statusFilter, setStatusFilter] = useState("ทั้งหมด");

  const filtered = useMemo(() => {
    let list = rows;
    if (typeFilter !== "ทั้งหมด")
      list = list.filter((x) => x.type === typeFilter);
    if (methodFilter !== "ทั้งหมด")
      list = list.filter((x) => x.payment_method === methodFilter);
    if (statusFilter !== "ทั้งหมด")
      list = list.filter((x) => x.status === statusFilter);
    const k = q.trim().toLowerCase();
    if (!k) return list;
    return list.filter((x) =>
      `${x.id} ${x.type} ${x.payment_method} ${x.amount} ${x.note} ${
        x.status
      } ${x.broker_id ?? ""}`
        .toLowerCase()
        .includes(k)
    );
  }, [rows, q, typeFilter, methodFilter, statusFilter]);

  const onApprove = async (id) => {
    try {
      await approveTransaction(id);
      await reload();
    } catch (e) {
      alert(e?.message || "อนุมัติไม่สำเร็จ");
    }
  };
  const onReject = async (id) => {
    try {
      await rejectTransaction(id);
      await reload();
    } catch (e) {
      alert(e?.message || "ปฏิเสธไม่สำเร็จ");
    }
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
          subtitle="ตรวจสอบ อนุมัติ/ปฏิเสธ และดาวน์โหลดใบเสร็จ"
        />

        <main className="p-4 sm:p-6 pt-28">
          <div className="max-w-6xl mx-auto space-y-4">
            {loading ? (
              <Card>กำลังโหลดข้อมูล…</Card>
            ) : err ? (
              <Card className="text-rose-600">{err}</Card>
            ) : (
              <>
                {/* สรุปตัวเลขรวม */}
                <Card>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                    <div>
                      <div className="text-xs text-slate-500">
                        จำนวนรายการทั้งหมด
                      </div>
                      <div className="text-2xl font-semibold">
                        {summary?.total ?? 0}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">
                        รายรับ (อนุมัติ)
                      </div>
                      <div className="text-2xl font-semibold">
                        {(summary?.incomeApproved ?? 0).toLocaleString(
                          "th-TH",
                          { minimumFractionDigits: 2 }
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">
                        รายจ่าย (อนุมัติ)
                      </div>
                      <div className="text-2xl font-semibold">
                        {(summary?.expenseApproved ?? 0).toLocaleString(
                          "th-TH",
                          { minimumFractionDigits: 2 }
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">รอการตรวจสอบ</div>
                      <div className="text-2xl font-semibold">
                        {summary?.byStatus?.["รอการตรวจสอบ"] ?? 0}
                      </div>
                    </div>
                  </div>
                </Card>

                {/* แผงค้นหา/กรอง */}
                <Card>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    <div>
                      <label className="block text-sm text-slate-600 mb-1">
                        ประเภท
                      </label>
                      <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="w-full border rounded-lg px-3 py-2 bg-white"
                      >
                        <option>ทั้งหมด</option>
                        <option>รายรับ</option>
                        <option>รายจ่าย</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-slate-600 mb-1">
                        วิธีจ่าย
                      </label>
                      <select
                        value={methodFilter}
                        onChange={(e) => setMethodFilter(e.target.value)}
                        className="w-full border rounded-lg px-3 py-2 bg-white"
                      >
                        <option>ทั้งหมด</option>
                        <option>เงินสด</option>
                        <option>โอนเงิน</option>
                        <option>ผ่อนชำระ</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-slate-600 mb-1">
                        สถานะ
                      </label>
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full border rounded-lg px-3 py-2 bg-white"
                      >
                        <option>ทั้งหมด</option>
                        <option>รอการตรวจสอบ</option>
                        <option>อนุมัติ</option>
                        <option>ปฏิเสธ</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm text-slate-600 mb-1">
                        ค้นหา
                      </label>
                      <input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="ค้นหา broker_id / ประเภท / วิธีจ่าย / หมายเหตุ / สถานะ"
                        className="w-full border rounded-lg px-3 py-2 bg-white"
                      />
                    </div>
                  </div>
                </Card>

                {/* ตารางรายการ */}
                <Card>
                  {filtered.length === 0 ? (
                    <div className="text-sm text-slate-600">ยังไม่มีรายการ</div>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="text-left bg-slate-50 text-slate-600">
                            <th className="py-2 px-3">เวลา</th>
                            <th className="py-2 px-3">นายหน้า</th>
                            <th className="py-2 px-3">ประเภท</th>
                            <th className="py-2 px-3">วิธีจ่าย</th>
                            <th className="py-2 px-3">จำนวนเงิน</th>
                            <th className="py-2 px-3">สถานะ</th>
                            <th className="py-2 px-3">ใบเสร็จ</th>
                            <th className="py-2 px-3">หมายเหตุ</th>
                            <th className="py-2 px-3">การทำรายการ</th>
                            <th className="py-2 px-3">#ไอดี</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filtered.map((r, i) => (
                            <tr
                              key={r.id}
                              className={
                                i % 2 === 0 ? "bg-white" : "bg-slate-50/60"
                              }
                            >
                              <td className="py-2 px-3">{fmt(r.created_at)}</td>
                              <td className="py-2 px-3">
                                {r.broker_id ?? "-"}
                              </td>
                              <td className="py-2 px-3">{r.type}</td>
                              <td className="py-2 px-3">{r.payment_method}</td>
                              <td className="py-2 px-3">
                                {r.amount.toLocaleString("th-TH", {
                                  minimumFractionDigits: 2,
                                })}
                              </td>
                              <td className="py-2 px-3">
                                <span
                                  className={`px-2 py-0.5 rounded-lg text-xs ${
                                    r.status === "รอการตรวจสอบ"
                                      ? "bg-amber-100 text-amber-700"
                                      : r.status === "อนุมัติ"
                                      ? "bg-emerald-100 text-emerald-700"
                                      : "bg-rose-100 text-rose-700"
                                  }`}
                                >
                                  {r.status}
                                </span>
                              </td>
                              <td className="py-2 px-3">
                                {r.invoice_ref ? (
                                  <a
                                    href={toFileUrl(r.invoice_ref)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-emerald-700 underline"
                                  >
                                    ดาวน์โหลด
                                  </a>
                                ) : r.receipt?.dataUrl ? (
                                  <a
                                    href={r.receipt.dataUrl}
                                    download={r.receipt.name || "receipt"}
                                    className="text-emerald-700 underline"
                                  >
                                    ดาวน์โหลด
                                  </a>
                                ) : (
                                  "-"
                                )}
                              </td>
                              <td className="py-2 px-3">{r.note || "-"}</td>
                              <td className="py-2 px-3">
                                {r.status === "รอการตรวจสอบ" ? (
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => onApprove(r.id)}
                                      className="px-3 py-1 rounded-lg text-xs bg-emerald-700 text-white hover:bg-emerald-800"
                                    >
                                      อนุมัติ
                                    </button>
                                    <button
                                      onClick={() => onReject(r.id)}
                                      className="px-3 py-1 rounded-lg text-xs bg-rose-600 text-white hover:bg-rose-700"
                                    >
                                      ปฏิเสธ
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-slate-400 text-xs">
                                    —
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-slate-500">
                                {r.id.slice(0, 8)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Card>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
