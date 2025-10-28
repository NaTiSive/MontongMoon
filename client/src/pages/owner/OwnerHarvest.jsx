// src/pages/owner/OwnerHarvest.jsx
import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "../../components/Sidebar";
import HeaderWrapper from "../../components/HeaderWrapper";
import Card from "../../components/Card";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

export default function OwnerHarvest() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (!user || user.role !== "owner") navigate("/login");
  }, [user, navigate]);

  // mock harvest summary (เกรด/น้ำหนักกก.)
  const [grades, setGrades] = useState([
    { grade: "A", weight: 850 },
    { grade: "B", weight: 650 },
    { grade: "C", weight: 320 },
    { grade: "ตกเกรด", weight: 170 },
  ]);

  const total = useMemo(() => grades.reduce((s, g) => s + g.weight, 0), [grades]);

  return (
    <div className={`min-h-screen w-full bg-slate-50 text-slate-900 flex flex-col md:flex-row ${isSidebarOpen ? "overflow-hidden md:overflow-auto" : ""}`}>
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      {isSidebarOpen && <div className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={() => setIsSidebarOpen(false)} />}

      <div className="flex-1 min-w-0 flex flex-col">
        <HeaderWrapper
          onMenuClick={() => setIsSidebarOpen(true)}
          title="สรุปการเก็บเกี่ยว"
          subtitle="ปริมาณผลผลิตแยกตามเกรด (mock)"
        />
        <main className="p-4 sm:p-6 pt-28">
          <div className="max-w-5xl mx-auto space-y-4">
            <Card>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">รวมผลผลิต</h3>
                <div className="text-sm">ทั้งหมด <b>{total.toLocaleString("th-TH")}</b> กิโลกรัม</div>
              </div>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                {grades.map((g) => (
                  <div key={g.grade} className="border rounded-lg p-3 bg-white shadow-sm flex justify-between">
                    <div className="font-medium">เกรด {g.grade}</div>
                    <div className="font-semibold">{g.weight.toLocaleString("th-TH")} กก.</div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-3">* ข้อมูลนี้เป็น mock — ต่อ API ภายหลัง</p>
            </Card>

            <Card>
              <h3 className="font-semibold mb-2">หมายเหตุการเก็บเกี่ยว</h3>
              <textarea className="w-full border rounded-lg px-3 py-2 bg-white" rows={3} placeholder="บันทึกเงื่อนไขการเก็บ / ปริมาณคาดการณ์ / คุณภาพโดยรวม…" />
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
