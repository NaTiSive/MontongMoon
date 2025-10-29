// src/pages/owner/OwnerExportConfirm.jsx
import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "../../components/Sidebar";
import HeaderWrapper from "../../components/HeaderWrapper";
import Card from "../../components/Card";
import PrimaryButton from "../../components/PrimaryButton";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const FRUITS_KEY = "mm:fruits@v1";
const CONTRACTS_KEY = "mm:contracts@v1";

function loadLS(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback ?? null)); }
  catch { return fallback ?? null; }
}
function saveLS(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}
function uuid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,(c)=>{
    const r=(Math.random()*16)|0, v=c==="x"?r:(r&0x3)|0x8; return v.toString(16);
  });
}

export default function OwnerExportConfirm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [err, setErr] = useState("");
  const [rows, setRows] = useState([]);

  useEffect(() => {
    if (!user || user.role !== "owner") navigate("/login");
  }, [user, navigate]);

  useEffect(() => {
    setRows(loadLS(FRUITS_KEY, []) || []);
  }, []);

  const sumAvail = (grade) => {
    const total = rows.filter(r => r?.grade === grade && r?.type !== "ส่งออก")
                      .reduce((s, r) => s + Number(r?.weight_kg || 0), 0);
    const exported = rows.filter(r => r?.grade === grade && r?.type === "ส่งออก")
                         .reduce((s, r) => s + Number(r?.weight_kg || 0), 0);
    return Math.max(0, total - exported);
  };

  const stock = useMemo(() => ({
    A: sumAvail("A"),
    B: sumAvail("B"),
    C: sumAvail("C"),
  }), [rows]);

  // Contracts ที่รอ Owner ยืนยัน
  const contracts = useMemo(() => {
    const all = loadLS(CONTRACTS_KEY, []) || [];
    return all
      .filter(c => c.status === "รอการยืนยันจากเจ้าของสวน")
      .sort((a, b) => new Date(b.contract_date) - new Date(a.contract_date));
  }, []);

  const confirmForContract = (contract_id) => {
    try {
      // 1) สร้าง DURIAN_FRUIT 3 รายการ (A, B, C) type="ส่งออก" ตาม UC16 ข้อ 7
      const a = stock.A, b = stock.B, c = stock.C;
      const toCreate = [
        { grade: "A", weight_kg: a },
        { grade: "B", weight_kg: b },
        { grade: "C", weight_kg: c },
      ].filter(x => x.weight_kg > 0); // สร้างเฉพาะที่มีสต็อก

      const allFruits = loadLS(FRUITS_KEY, []) || [];
      const now = new Date().toISOString();
      toCreate.forEach(x => {
        allFruits.push({
          id: uuid(),
          grade: x.grade,
          weight_kg: Number(x.weight_kg),
          count: null,
          type: "ส่งออก",
          harvest_at: now,
          note: "ยืนยันส่งออก (Owner)",
        });
      });
      saveLS(FRUITS_KEY, allFruits);
      setRows(allFruits);

      // 2) อัปเดตสถานะ contract → “ส่งออกเสร็จสิ้น” (UC16 ข้อ 9)
      const all = loadLS(CONTRACTS_KEY, []) || [];
      const idx = all.findIndex(c => c.contract_id === contract_id);
      if (idx === -1) throw new Error("ไม่พบสัญญาที่เลือก");
      all[idx].status = "ส่งออกเสร็จสิ้น";
      saveLS(CONTRACTS_KEY, all);

      alert("ยืนยันการส่งออกเสร็จสิ้น");
      navigate("/owner/dashboard");
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
          title="ยืนยันการส่งออก (เจ้าของสวน)"
          subtitle="ตรวจสอบปริมาณตามเกรด แล้วกดยืนยันเพื่อปิดสัญญา"
        />

        <main className="p-4 sm:p-6 pt-28">
          <div className="max-w-4xl mx-auto space-y-4">
            {err && <Card className="text-rose-600">{err}</Card>}

            {/* ปริมาณรวมที่พร้อมส่งออก */}
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

            {/* รายการสัญญาที่รอการยืนยัน */}
            <Card>
              <div className="text-sm text-slate-700 mb-2">สัญญาที่รอการยืนยันจากเจ้าของสวน</div>
              <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left bg-slate-50 text-slate-600">
                      <th className="py-2 px-3">วันที่</th>
                      <th className="py-2 px-3">Contract ID</th>
                      <th className="py-2 px-3">Broker</th>
                      <th className="py-2 px-3">สถานะ</th>
                      <th className="py-2 px-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {contracts.length === 0 ? (
                      <tr><td className="py-3 px-3" colSpan={5}>ไม่มีรายการรอการยืนยัน</td></tr>
                    ) : contracts.map((c, i) => (
                      <tr key={c.contract_id} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
                        <td className="py-2 px-3">{new Date(c.contract_date).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })}</td>
                        <td className="py-2 px-3">{c.contract_id}</td>
                        <td className="py-2 px-3">#{c.broker_id}</td>
                        <td className="py-2 px-3">{c.status}</td>
                        <td className="py-2 px-3">
                          <PrimaryButton title="ยืนยันส่งออก" onClick={() => confirmForContract(c.contract_id)} />
                        </td>
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
