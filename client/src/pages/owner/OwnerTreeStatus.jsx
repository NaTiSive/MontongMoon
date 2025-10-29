// src/pages/owner/OwnerTreeStatus.jsx
import React, { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";
import HeaderWrapper from "../../components/HeaderWrapper";
import Card from "../../components/Card";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { getBrokerSubmissionContext } from "../../api/contracts";

export default function OwnerTreeStatus() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ totalTrees: 0, problemsOpen: 0, byStatus: [] });
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!user || user.role !== "owner") navigate("/login");
  }, [user, navigate]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const s = await getBrokerSubmissionContext({ owner_id: 1 });
        if (!alive) return;
        setSummary(s);
      } catch (e) {
        if (!alive) return;
        setErr(e?.message || "โหลดข้อมูลไม่สำเร็จ");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const statusStyle = {
    "ปกติ": { box: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-300" },
    "ออกดอก": { box: "bg-sky-100", text: "text-sky-700", border: "border-sky-300" },
    "ออกผล": { box: "bg-amber-100", text: "text-amber-700", border: "border-amber-300" },
    "มีปัญหา": { box: "bg-rose-100", text: "text-rose-700", border: "border-rose-300" },
    "มีปัญหา(ปิดแล้ว)": { box: "bg-gray-100", text: "text-gray-700", border: "border-gray-300" },
  };

  const buckets = (summary.byStatus || []).map(s => ({
    key: s.status, count: s.count, ...(statusStyle[s.status] || statusStyle["ปกติ"])
  }));

  return (
    <div className={`min-h-screen w-full bg-slate-50 text-slate-900 flex flex-col md:flex-row ${isSidebarOpen ? "overflow-hidden md:overflow-auto" : ""}`}>
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      {isSidebarOpen && <div className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={() => setIsSidebarOpen(false)} />}
      <div className="flex-1 min-w-0 flex flex-col">
        <HeaderWrapper
          onMenuClick={() => setIsSidebarOpen(true)}
          title="สถานะต้นทุเรียน"
          subtitle="ภาพรวมจำนวนต้นตามสถานะ และปัญหาที่คงค้าง"
        />
        <main className="p-4 sm:p-6 pt-28">
          <div className="max-w-5xl mx-auto space-y-4">
            {loading ? (
              <Card>กำลังโหลดข้อมูล…</Card>
            ) : err ? (
              <Card className="text-rose-600">{err}</Card>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {buckets.map(b => (
                    <Card key={b.key} className={`border ${b.border}`}>
                      <div className={`${b.box} rounded-xl px-4 py-5`}>
                        <div className={`text-sm ${b.text}`}>{b.key}</div>
                        <div className="mt-1 text-2xl font-semibold">{b.count}</div>
                      </div>
                    </Card>
                  ))}
                </div>

                <Card>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-slate-500">จำนวนต้นทั้งหมด</div>
                      <div className="text-xl font-semibold">{summary.totalTrees}</div>
                    </div>
                    <div>
                      <div className="text-slate-500">ปัญหาที่ยังคงค้าง</div>
                      <div className="text-xl font-semibold">{summary.problemsOpen}</div>
                    </div>
                    <div>
                      <div className="text-slate-500">ต้นใช้งาน (ไม่รวมปัญหาเปิด)</div>
                      <div className="text-xl font-semibold">
                        {Math.max(0, (summary.totalTrees || 0) - (summary.problemsOpen || 0))}
                      </div>
                    </div>
                  </div>
                </Card>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
