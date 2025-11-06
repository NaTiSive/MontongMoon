// src/pages/broker/BrokerExportConfirm.jsx
import React, { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";
import HeaderWrapper from "../../components/HeaderWrapper";
import Card from "../../components/Card";
import PrimaryButton from "../../components/PrimaryButton";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

import {
  getBrokerStockWithPrices,
  submitExportRequest,
  listBrokerExportRequests,
  withdrawExportRequest,
} from "../../api/export";

export default function BrokerExportConfirm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [err, setErr] = useState("");
  const [stock, setStock] = useState({
    A: { amount: 0, price: 0 },
    B: { amount: 0, price: 0 },
    C: { amount: 0, price: 0 },
  });
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (!user || user.role !== "broker") navigate("/login");
  }, [user, navigate]);

  const brokerId = user?.broker_id;

  const reload = async () => {
    try {
      const [s, h] = await Promise.all([
        getBrokerStockWithPrices(brokerId),
        listBrokerExportRequests(brokerId),
      ]);
      setStock({
        A: {
          amount: Number(s?.A?.amount ?? 0),
          price: Number(s?.A?.price ?? 0),
        },
        B: {
          amount: Number(s?.B?.amount ?? 0),
          price: Number(s?.B?.price ?? 0),
        },
        C: {
          amount: Number(s?.C?.amount ?? 0),
          price: Number(s?.C?.price ?? 0),
        },
      });
      setHistory(h);
      setErr("");
    } catch (e) {
      setErr(e.message || "โหลดข้อมูลไม่สำเร็จ");
    }
  };

  useEffect(() => {
    reload();
  }, [brokerId]);

  const sum =
    Number(stock?.A?.amount ?? 0) +
    Number(stock?.B?.amount ?? 0) +
    Number(stock?.C?.amount ?? 0);

  const send = async () => {
    try {
      await submitExportRequest({
        broker_id: brokerId,
        grades: {
          A: Number(stock?.A?.amount ?? 0),
          B: Number(stock?.B?.amount ?? 0),
          C: Number(stock?.C?.amount ?? 0),
        },
      });
      alert("ส่งคำขอแล้ว");
      await reload();
    } catch (e) {
      setErr(e.message);
    }
  };

  const withdraw = async (id) => {
    try {
      await withdrawExportRequest({ req_id: id, broker_id: brokerId });
      await reload();
    } catch (e) {
      alert(e.message);
    }
  };

  const fmtDT = (iso) => new Date(iso).toLocaleString("th-TH");
  const badge = (st) =>
    st === "รอการยืนยันจากเจ้าของสวน" ? "bg-amber-100 text-amber-700"
    : st === "ยืนยันแล้ว" ? "bg-emerald-100 text-emerald-700"
    : st === "ปฏิเสธแล้ว" ? "bg-rose-100 text-rose-700"
    : "bg-slate-100 text-slate-700";

  return (
    <div className={`min-h-screen w-full bg-slate-50 text-slate-900 flex flex-col md:flex-row ${isSidebarOpen ? "overflow-hidden md:overflow-auto" : ""}`}>
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="flex-1 min-w-0 flex flex-col">
        <HeaderWrapper
          onMenuClick={() => setIsSidebarOpen(true)}
          title="ส่งคำขอส่งออก (ผู้รับเหมา)"
          subtitle="ตรวจสอบสต็อกพร้อมส่งออก แล้วส่งให้เจ้าของสวนพิจารณา"
        />

        <main className="p-4 sm:p-6 pt-28">
          <div className="max-w-5xl mx-auto space-y-4">
            {err && <Card className="text-rose-600">{err}</Card>}

            {/* พร้อมส่งออก */}
            <Card>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <Stat
                  label="พร้อมส่งออก A (กก.)"
                  value={stock.A?.amount}
                  price={stock.A?.price}
                />
                <Stat
                  label="พร้อมส่งออก B (กก.)"
                  value={stock.B?.amount}
                  price={stock.B?.price}
                />
                <Stat
                  label="พร้อมส่งออก C (กก.)"
                  value={stock.C?.amount}
                  price={stock.C?.price}
                />
                <Stat label="รวม (กก.)" value={sum} />
              </div>
              <div className="mt-3 flex justify-end">
                <PrimaryButton title="ส่งให้เจ้าของสวนพิจารณา" onClick={send} disabled={sum <= 0} />
              </div>
            </Card>

            {/* ประวัติคำขอ */}
            <Card>
              <div className="text-sm text-slate-700 mb-2">ประวัติคำขอส่งออก (ของฉัน)</div>
              <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left bg-slate-50 text-slate-600">
                      <th className="py-2 px-3">วันที่</th>
                      <th className="py-2 px-3">A</th>
                      <th className="py-2 px-3">B</th>
                      <th className="py-2 px-3">C</th>
                      <th className="py-2 px-3">รวม</th>
                      <th className="py-2 px-3">สถานะ</th>
                      <th className="py-2 px-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.length === 0 ? (
                      <tr><td className="py-3 px-3" colSpan={7}>ยังไม่มีคำขอ</td></tr>
                    ) : history.map((r, i) => {
                      const a = Number(r.grades?.A ?? r.gradeA ?? 0);
                      const b = Number(r.grades?.B ?? r.gradeB ?? 0);
                      const c = Number(r.grades?.C ?? r.gradeC ?? 0);
                      const s = Number(r.grades?.total ?? r.total ?? a + b + c);
                      return (
                        <tr key={r.id} className={i%2===0 ? "bg-white" : "bg-slate-50/60"}>
                          <td className="py-2 px-3">{fmtDT(r.created_at)}</td>
                          <td className="py-2 px-3">{a}</td>
                          <td className="py-2 px-3">{b}</td>
                          <td className="py-2 px-3">{c}</td>
                          <td className="py-2 px-3">{s}</td>
                          <td className="py-2 px-3"><span className={`px-2 py-0.5 rounded ${badge(r.status)}`}>{r.status}</span></td>
                          <td className="py-2 px-3">
                            {r.status === "รอการยืนยันจากเจ้าของสวน" && (
                              <button onClick={() => withdraw(r.id)} className="text-sm px-3 py-1.5 rounded bg-slate-200 hover:bg-slate-300">
                                ยกเลิกคำขอ
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
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

function Stat({ label, value, price }) {
  const formattedValue = Number(value ?? 0).toLocaleString("th-TH");
  const hasPrice = price !== undefined && price !== null;
  const formattedPrice = hasPrice
    ? Number(price || 0).toLocaleString("th-TH", {
        style: "currency",
        currency: "THB",
        minimumFractionDigits: 2,
      })
    : null;
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-2xl font-semibold">{formattedValue}</div>
      {hasPrice && (
        <div className="mt-1 text-xs text-slate-500">
          ราคา: {formattedPrice}/กก.
        </div>
      )}
    </div>
  );
}
