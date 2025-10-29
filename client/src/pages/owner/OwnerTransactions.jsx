// src/pages/owner/OwnerTransactions.jsx
import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "../../components/Sidebar";
import HeaderWrapper from "../../components/HeaderWrapper";
import Card from "../../components/Card";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { listAllContracts } from "../../api/contracts";

export default function OwnerTransactions() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || user.role !== "owner") navigate("/login");
  }, [user, navigate]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const all = await listAllContracts();
      const accepted = all.filter(c => c.status === "ยอมรับ");
      if (alive) setRows(accepted);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  const totalQty = useMemo(() => rows.reduce((s, r) => s + Number(r.qtt_estimate || 0), 0), [rows]);
  const avgPrice = useMemo(() => {
    if (rows.length === 0) return 0;
    return rows.reduce((s, r) => s + Number(r.offerprice || 0), 0) / rows.length;
  }, [rows]);

  const fmtDT = (iso) =>
    new Date(iso).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });

  return (
    <div className={`min-h-screen w-full bg-slate-50 text-slate-900 flex flex-col md:flex-row ${isSidebarOpen ? "overflow-hidden md:overflow-auto" : ""}`}>
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      {isSidebarOpen && <div className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={() => setIsSidebarOpen(false)} />}

      <div className="flex-1 min-w-0 flex flex-col">
        <HeaderWrapper
          onMenuClick={() => setIsSidebarOpen(true)}
          title="ธุรกรรม/สัญญา"
          subtitle="ข้อเสนอที่ได้รับการยอมรับแล้ว"
        />
        <main className="p-4 sm:p-6 pt-28">
          <div className="max-w-6xl mx-auto space-y-4">
            <Card>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-slate-500">จำนวนสัญญาที่อนุมัติ</div>
                  <div className="text-xl font-semibold">{rows.length}</div>
                </div>
                <div>
                  <div className="text-slate-500">ปริมาณรวม (กก.)</div>
                  <div className="text-xl font-semibold">{totalQty.toLocaleString("th-TH")}</div>
                </div>
                <div>
                  <div className="text-slate-500">ราคาเฉลี่ย (บาท/กก.)</div>
                  <div className="text-xl font-semibold">{avgPrice.toFixed(2)}</div>
                </div>
              </div>
            </Card>

            <Card>
              <h3 className="font-semibold mb-2">รายละเอียดสัญญา</h3>
              {loading ? (
                <div>กำลังโหลด…</div>
              ) : rows.length === 0 ? (
                <div className="text-slate-600 text-sm">ยังไม่มีสัญญาที่ถูกยอมรับ</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left border-b">
                        <th className="py-2 pr-4">สัญญา #</th>
                        <th className="py-2 pr-4">วันที่</th>
                        <th className="py-2 pr-4">Broker</th>
                        <th className="py-2 pr-4">ปริมาณ (กก.)</th>
                        <th className="py-2 pr-4">ราคา (บาท/กก.)</th>
                        <th className="py-2 pr-4">ชำระเงิน</th>
                        <th className="py-2 pr-4">หมายเหตุ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map(r => (
                        <tr key={r.contract_id} className="border-b">
                          <td className="py-2 pr-4 font-medium">#{r.contract_id.slice(0, 8)}</td>
                          <td className="py-2 pr-4">{fmtDT(r.contract_date)}</td>
                          <td className="py-2 pr-4">{r.broker_id ?? "-"}</td>
                          <td className="py-2 pr-4">{Number(r.qtt_estimate).toLocaleString("th-TH")}</td>
                          <td className="py-2 pr-4">{Number(r.offerprice).toLocaleString("th-TH")}</td>
                          <td className="py-2 pr-4">{r.payment_term}</td>
                          <td className="py-2 pr-4">{r.note || "-"}</td>
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
