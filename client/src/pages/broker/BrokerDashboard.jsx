// src/pages/broker/BrokerDashboard.jsx
import React, { useMemo, useState, useEffect } from "react";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import Card from "../../components/Card";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

export default function BrokerDashboard() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // ☰ toggle sidebar

  // 🛡️ Guard กันเข้าผิด role หรือยังไม่ login
  useEffect(() => {
    if (!user) return; // รอโหลดจาก AuthContext ก่อน
    if (user.role !== "broker") navigate("/login");
  }, [user, navigate]);

  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center text-gray-600">
        กำลังโหลดข้อมูลผู้ใช้...
      </div>
    );
  }

  const status = user.approvalStatus || "pending";

  return (
    // flex-col บนมือถือ, md:flex-row บนจอใหญ่ + กันสกรอลล์พื้นหลังเมื่อเปิดเมนู
    <div
      className={`min-h-screen w-full bg-slate-50 text-slate-900 flex flex-col md:flex-row ${
        isSidebarOpen ? "overflow-hidden md:overflow-auto" : ""
      }`}
    >
      {/* Sidebar (responsive drawer) */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* Overlay มืดหลัง Sidebar (เฉพาะมือถือ) */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
        />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          onMenuClick={() => setIsSidebarOpen(true)} // ☰ เปิด sidebar (เฉพาะ mobile)
          title="แดชบอร์ดผู้รับเหมา"
          subtitle={
            status === "approved"
              ? "สถานะ: ได้รับการอนุมัติจากเจ้าของสวน"
              : "สถานะ: รอการอนุมัติจากเจ้าของสวน"
          }
          name={user?.name || "ผู้รับเหมา"}
          role="ผู้รับเหมา"
        />

        <main className="p-4 sm:p-6 pt-28">
          {status === "pending" ? (
            <PendingBlock updateUser={updateUser} />
          ) : (
            <ApprovedContent />
          )}
        </main>
      </div>
    </div>
  );
}

/* ======================= โหมดรออนุมัติ ======================= */
function PendingBlock({ updateUser }) {
  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <h3 className="font-semibold text-slate-800 mb-1">
          บัญชีของคุณยังไม่ถูกอนุมัติ
        </h3>
        <p className="text-sm text-slate-600">
          เจ้าของสวนจะอนุมัติข้อเสนอของคุณเมื่อได้รับข้อมูลครบถ้วน
          กรุณายื่นข้อเสนอซื้อเพื่อให้เจ้าของสวนพิจารณา
        </p>
        <div className="flex gap-3 mt-4">
          <button
            className="px-4 py-2 rounded-lg bg-amber-500 text-white text-sm hover:bg-amber-600"
            onClick={() => alert("เปิดฟอร์มยื่นข้อเสนอ (จำลอง)")}
          >
            📝 ยื่นข้อเสนอซื้อทุเรียน
          </button>

          {/* ปุ่มสำหรับ dev จำลองการอนุมัติ */}
          <button
            className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm hover:bg-emerald-700"
            onClick={() => {
              updateUser({ approvalStatus: "approved" });
              alert("จำลองการอนุมัติสำเร็จ ✅");
            }}
          >
            ✅ จำลองการอนุมัติ
          </button>
        </div>
      </Card>
    </div>
  );
}

/* ======================= โหมดอนุมัติแล้ว ======================= */
function ApprovedContent() {
  const treeStatus = [
    { key: "ปกติ", count: 2, box: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-300" },
    { key: "มีปัญหา", count: 2, box: "bg-rose-100", text: "text-rose-700", border: "border-rose-300" },
    { key: "ออกดอก", count: 2, box: "bg-sky-100", text: "text-sky-700", border: "border-sky-300" },
    { key: "ออกผล", count: 2, box: "bg-amber-100", text: "text-amber-700", border: "border-amber-300" },
  ];

  const harvestSummary = [
    { grade: "เกรด A", weight: 850 },
    { grade: "เกรด B", weight: 850 },
    { grade: "เกรด C", weight: 300 },
  ];

  const totalHarvest = useMemo(
    () => harvestSummary.reduce((a, b) => a + b.weight, 0),
    [harvestSummary]
  );

  const activities = [
    { icon: "🟢", text: "ได้รับการยอมรับข้อเสนอแล้ว", sub: "สวน MonthongMoon" },
    { icon: "🟡", text: "บันทึกกิจกรรมรายต้น", sub: "ต้น T-032" },
    { icon: "🔺", text: "มีรายงานปัญหาในโซน C", sub: "ศัตรูพืชระบาด" },
  ];

  return (
    <div className="space-y-6">
      {/* แถวบน: สถานะต้น (ซ้าย) + สรุปเก็บเกี่ยว (ขวา) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <h3 className="font-semibold text-slate-800 mb-3">สถานะต้นทุเรียนในสวน</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {treeStatus.map((s) => (
              <div key={s.key} className={`rounded-xl border ${s.border} bg-white shadow-sm`}>
                <div className={`px-4 py-5 rounded-xl ${s.box}`}>
                  <div className={`text-sm ${s.text}`}>{s.key}</div>
                  <div className="mt-1 text-2xl font-semibold">{s.count}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold text-slate-800 mb-3">สรุปการเก็บเกี่ยว</h3>
          <ul className="divide-y text-sm">
            {harvestSummary.map((h) => (
              <li key={h.grade} className="py-2 flex justify-between">
                <span className="text-slate-700">{h.grade}</span>
                <span className="font-semibold">{h.weight} kg</span>
              </li>
            ))}
          </ul>
          <div className="mt-2 border-t pt-2 text-right text-sm">
            รวมทั้งหมด <span className="font-semibold">{totalHarvest} kg</span>
          </div>
        </Card>
      </div>

      {/* กราฟ placeholder */}
      <Card>
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-semibold text-slate-800">รายรับ vs รายจ่าย</h3>
          <span className="text-xs text-slate-500">ในรอบ 30 วันที่ผ่านมา</span>
        </div>
        <div className="h-56 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500">
          กราฟแสดงข้อมูล (placeholder)
        </div>
      </Card>

      {/* กิจกรรมล่าสุด */}
      <Card>
        <h3 className="font-semibold text-slate-800 mb-3">กิจกรรมล่าสุด</h3>
        <ul className="space-y-2 text-sm">
          {activities.map((a, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="mt-0.5">{a.icon}</span>
              <div>
                <div className="text-slate-800">{a.text}</div>
                {a.sub && <div className="text-xs text-slate-500">{a.sub}</div>}
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
