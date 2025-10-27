// src/pages/owner/OwnerDashboard.jsx
import React, { useState, useEffect } from "react";
import Card from "../../components/Card";
import Sidebar from "../../components/Sidebar";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import HeaderWrapper from "../../components/HeaderWrapper";

export default function OwnerDashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // ✅ toggle sidebar (สำหรับมือถือ)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (loading) return;   
    if (!user || user.role !== "owner") {
      navigate("/login");
    }
  }, [user,loading, navigate]);

  if (loading) {
  return <div className="h-screen flex items-center justify-center text-gray-600">กำลังโหลดข้อมูลผู้ใช้…</div>;
}

  const [deadline, setDeadline] = useState("2025-10-04T07:00");

  const treeStatus = [
    { key: "ปกติ", value: 2, bg: "bg-green-100", text: "text-green-700" },
    { key: "มีปัญหา", value: 1, bg: "bg-rose-100", text: "text-rose-700" },
    { key: "ออกดอก", value: 1, bg: "bg-sky-100", text: "text-sky-700" },
    { key: "ออกผล", value: 1, bg: "bg-amber-100", text: "text-amber-700" },
  ];

  const offers = [
    { broker: "ผู้รับเหมา A", price: "฿35.00 / kg", qty: 300, ok: true },
    { broker: "ผู้รับเหมา B", price: "฿32.50 / kg", qty: 500, ok: false },
    { broker: "ผู้รับเหมา C", price: "฿31.00 / kg", qty: 400, ok: true },
    { broker: "ผู้รับเหมา D", price: "฿31.00 / kg", qty: 400, ok: true },
  ];

  const activities = [
    { icon: "📝", text: "บันทึกรายการรายรับ", when: "ก่อนหน้า 3 ชม." },
    { icon: "📨", text: "ได้รับการยื่นข้อเสนอแล้วจาก Broker B", when: "เมื่อวาน" },
    { icon: "⚠️", text: "มีรายงานปัญหาใบไหม้ในโซน C", when: "2 วันก่อน" },
  ];

  const harvestSummary = [
    { grade: "เกรด A", weight: 850 },
    { grade: "เกรด B", weight: 850 },
    { grade: "เกรด C", weight: 300 },
    { grade: "ตกเกรด", weight: 350 },
  ];

  return (
    // ✅ มือถือ: เรียงแนวตั้ง / เดสก์ท็อป: เรียงแนวนอน
    <div
      className={`min-h-screen w-full bg-slate-50 text-slate-900 flex flex-col md:flex-row ${
        isSidebarOpen ? "overflow-hidden md:overflow-auto" : ""
      }`}
    >
      {/* ✅ Sidebar แบบ Drawer (มือถือ) + Fixed (เดสก์ท็อป) */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* ✅ Overlay มืดสำหรับมือถือ คลิกเพื่อปิด */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
        />
      )}

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* ✅ ส่ง onMenuClick ให้ Header ผ่าน HeaderWrapper เพื่อให้ปุ่ม ☰ เปิดเมนูได้ */}
        <HeaderWrapper
          onMenuClick={() => setIsSidebarOpen(true)}
          title="แดชบอร์ดเจ้าของสวน"
          subtitle="ติดตามภาพรวมของสวนของคุณ"
        />

        <main className="p-4 sm:p-6 pt-28">
          {/* แถว: Deadline + สถานะต้นทุเรียน */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* ✅ แก้ปุ่มหลุดจาก Card: จัด layout ใหม่ให้ปลอดภัยทุกขนาดจอ */}
            <Card>
              <h3 className="font-semibold text-gray-800 mb-2">
                กำหนดวันสิ้นสุดการรับข้อเสนอ
              </h3>
              <p className="text-xs text-gray-500 mb-3">
                ใช้เพื่อควบคุมรอบการยื่นข้อเสนอของผู้รับเหมา หากหมดเขต
                ระบบจะปิดการยื่นอัตโนมัติ
              </p>

              {/* มือถือวางเป็นคอลัมน์ / จอใหญ่ค่อยวางเป็นแถว */}
              <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
                <div className="flex-1">
                  <input
                    type="datetime-local"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 outline-none"
                  />
                </div>
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700"
                  onClick={() => console.log("save deadline:", deadline)}
                >
                  บันทึกกำหนด
                </button>
              </div>

              <p className="text-xs text-gray-400 mt-3">
                อัปเดตครั้งล่าสุด: 3 ต.ค. 2568 02:13
              </p>
            </Card>

            {/* สถานะต้นทุเรียนในสวน */}
            <Card>
              <h3 className="font-semibold text-gray-800 mb-3">
                สถานะต้นทุเรียนในสวน
              </h3>
              <div className="space-y-2">
                {treeStatus.map((s) => (
                  <div
                    key={s.key}
                    className={`flex justify-between items-center ${s.bg} rounded-lg px-3 py-2`}
                  >
                    <span className={`${s.text} text-sm`}>{s.key}</span>
                    <span className="font-semibold">{s.value}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* กราฟ placeholder */}
          <Card>
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold text-gray-800">รายรับ vs รายจ่าย</h3>
              <span className="text-xs text-gray-500">ในรอบ 30 วันที่ผ่านมา</span>
            </div>
            <div className="h-56 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500">
              กราฟแสดงข้อมูล (placeholder)
            </div>
          </Card>

          {/* แถว: กิจกรรมล่าสุด + ข้อเสนอ + สรุปเก็บเกี่ยว */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mt-4">
            <Card>
              <h3 className="font-semibold text-gray-800 mb-3">
                กิจกรรมล่าสุด
              </h3>
              <ul className="space-y-2 text-sm">
                {activities.map((a, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="mt-0.5">{a.icon}</span>
                    <div>
                      <div className="text-gray-800">{a.text}</div>
                      <div className="text-xs text-gray-500">{a.when}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>

            <Card>
              <h3 className="font-semibold text-gray-800 mb-3">
                ข้อเสนอจากผู้รับเหมา
              </h3>
              <div className="space-y-2">
                {offers.map((o, idx) => (
                  <Card key={idx}>
                    <div>
                      <div className="font-medium text-gray-800">{o.broker}</div>
                      <div className="text-xs text-gray-500">
                        {o.price} • {o.qty} kg
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        className="px-3 py-1 rounded-lg bg-green-600 text-white text-sm hover:bg-green-700"
                        onClick={() => console.log("accept offer", idx)}
                      >
                        อนุมัติ
                      </button>
                      <button
                        className="px-3 py-1 rounded-lg bg-rose-500 text-white text-sm hover:bg-rose-600"
                        onClick={() => console.log("reject offer", idx)}
                      >
                        ปฏิเสธ
                      </button>
                    </div>
                  </Card>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-2">* ปุ่มยังไม่เชื่อมระบบ</p>
            </Card>

            <Card>
              <h3 className="font-semibold text-gray-800 mb-3">
                สรุปการเก็บเกี่ยว
              </h3>
              <ul className="divide-y text-sm">
                {harvestSummary.map((h) => (
                  <li key={h.grade} className="py-2 flex justify-between">
                    <span className="text-gray-700">{h.grade}</span>
                    <span className="font-semibold">{h.weight} kg</span>
                  </li>
                ))}
              </ul>
              <div className="mt-2 text-right text-sm text-gray-600">
                รวมทั้งหมด:{" "}
                <span className="font-semibold">
                  {harvestSummary.reduce((a, b) => a + b.weight, 0)} kg
                </span>
              </div>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
