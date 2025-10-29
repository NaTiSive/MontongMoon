// src/pages/broker/BrokerExportConfirm.jsx
import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "../../components/Sidebar";
import HeaderWrapper from "../../components/HeaderWrapper";
import Card from "../../components/Card";
import PrimaryButton from "../../components/PrimaryButton";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

// ใช้ตรง LocalStorage ตามแนวทาง B เพื่อไม่แตะไฟล์ api เดิม
const FRUITS_KEY = "mm:fruits@v1";
const CONTRACTS_KEY = "mm:contracts@v1";

function loadLS(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback ?? null)); }
  catch { return fallback ?? null; }
}
function saveLS(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

export default function BrokerExportConfirm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!user || user.role !== "broker") navigate("/login");
  }, [user, navigate]);

  const rows = loadLS(FRUITS_KEY, []) || [];
  // รวมเฉพาะของ broker นี้ (สมมติ harvest ใส่ broker_id ไว้; ถ้าไม่มี ให้รวมทั้งระบบก็ได้)
  const brokerRows = rows.filter(r => String(r?.broker_id || user?.broker_id) === String(user?.broker_id));

  const sumBy = (grade) => {
    const totalHarvest = brokerRows
      .filter(r => r?.grade === grade && r?.type !== "ส่งออก")
      .reduce((s, r) => s + Number(r?.weight_kg || 0), 0);
    const totalExported = brokerRows
      .filter(r => r?.grade === grade && r?.type === "ส่งออก")
      .reduce((s, r) => s + Number(r?.weight_kg || 0), 0);
    return Math.max(0, totalHarvest - totalExported);
  };

  const stock = useMemo(() => ({
    A: sumBy("A"),
    B: sumBy("B"),
    C: sumBy("C"),
  }), [rows, user?.broker_id]);

  // หา contract ของ broker ที่ "ยอมรับ" ล่าสุดเพื่อยกระดับเป็น "รอการยืนยันจากเจ้าของสวน"
  const confirmExport = () => {
    try {
      const all = loadLS(CONTRACTS_KEY, []) || [];
      const accepted = all
        .filter(c => String(c.broker_id) === String(user?.broker_id) && c.status === "ยอมรับ")
        .sort((a, b) => new Date(b.contract_date) - new Date(a.contract_date));

      if (accepted.length === 0) {
        alert("ไม่พบข้อเสนอที่อยู่ในสถานะ 'ยอมรับ' สำหรับบัญชีของคุณ");
        return;
      }

      // ใช้ตัวล่าสุด
      const targetId = accepted[0].contract_id;
      const idx = all.findIndex(c => c.contract_id === targetId);
      if (idx === -1) throw new Error("ไม่พบสัญญาที่เลือก");

      // UC15: อัปเดตเป็น “รอการยืนยันจากเจ้าของสวน”
      all[idx].status = "รอการยืนยันจากเจ้าของสวน";
      saveLS(CONTRACTS_KEY, all);

      alert("ยืนยันการส่งออกเรียบร้อย (รอการยืนยันจากเจ้าของสวน)");
      navigate("/broker/dashboard");
    } catch (e) {
      setErr(e?.message || "ดำเนินการไม่สำเร็จ");
    }
  };

  return (
    <div className={`min-h-screen w-full bg-slate-50 text-slate-900 flex flex-col md:flex-row ${isSidebarOpen ? "overflow-hidden md:overflow-auto" : ""}`}>
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      {isSidebarOpen && <div className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={() => setIsSidebarOpen(false)} />}

      <div className="flex-1 min-w-0 flex flex-col">
        <HeaderWrapper
          onMenuClick={() => setIsSidebarOpen(true)}
          title="ยืนยันการส่งออก (ผู้รับเหมา)"
          subtitle="ตรวจสอบปริมาณตามเกรด แล้วกดยืนยันการส่งออก"
        />

        <main className="p-4 sm:p-6 pt-28">
          <div className="max-w-3xl mx-auto space-y-4">
            {err && <Card className="text-rose-600">{err}</Card>}

            <Card>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {["A","B","C"].map(g => (
                  <div key={g}>
                    <div className="text-slate-500 text-sm">ทุเรียนเกรด {g} พร้อมส่งออก (กก.)</div>
                    <div className="text-2xl font-semibold">{stock[g].toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <div className="text-sm text-slate-700">เมื่อกดยืนยัน ระบบจะอัปเดตสถานะสัญญาของคุณเป็น “รอการยืนยันจากเจ้าของสวน”</div>
              <div className="mt-3 flex justify-end">
                <PrimaryButton title="ยืนยันการส่งออก" onClick={confirmExport} />
              </div>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
