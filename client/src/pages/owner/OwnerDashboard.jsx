import React, { useState } from "react";
import PageHeader from "../../components/pageHeader";
import Card from "../../components/Card";
import PrimaryButton from "../../components/PrimaryButton";
import SearchBar from "../../components/Searchbar";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";

// ถ้ามี Card / Button / SearchBar ของคุณเองแล้ว ค่อยเปลี่ยนมาใช้ component เหล่านั้นได้

export default function OwnerDashboard() {
  // --- mock states ---
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
    {
      icon: "📨",
      text: "ได้รับการยื่นข้อเสนอแล้วจาก Broker B",
      when: "เมื่อวาน",
    },
    { icon: "⚠️", text: "มีรายงานปัญหาใบไหม้ในโซน C", when: "2 วันก่อน" },
  ];

  const harvestSummary = [
    { grade: "เกรด A", weight: 850 },
    { grade: "เกรด B", weight: 850 },
    { grade: "เกรด C", weight: 300 },
    { grade: "ตกเกรด", weight: 350 },
  ];

  return (
    // ====== Layout ครอบทั้งหน้า: Sidebar ซ้าย + Main ขวา ======
    <div className="min-h-screen w-full bg-slate-50 text-slate-900 flex">
      {/* Sidebar (fixed width) */}

      <div className="hhidden md:block w-56 lg:w-64 shrink-0 sticky top-0 h-screen z-50 bg-white shadow-md">
        <Sidebar />
      </div>

      {/* Main content: ให้กินพื้นที่ที่เหลือ และเลื่อน scroll ได้ */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Header (คงอยู่ด้านบนของ main) */}
        <div className="full">
          <Header
            title="แดชบอร์ดเจ้าของสวน"
            subtitle="ติดตามภาพรวมของสวนของคุณ"
            name="ชื่อผู้ใช้"
            role="เจ้าของสวน"
            className="py-3 px-6 flex justify-end items-center"
          />
        </div>
        {/* เนื้อหาหลักของหน้า */}
        <main className="p-4 sm:p-6">
          {/* แถว: Deadline + สถานะต้นทุเรียน */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* กล่องกำหนดวันสิ้นสุดการรับข้อเสนอ */}
            <Card>
              <h3 className="font-semibold text-gray-800 mb-2">
                กำหนดวันสิ้นสุดการรับข้อเสนอ
              </h3>
              <p className="text-xs text-gray-500 mb-3">
                ใช้เพื่อควบคุมรอบการยื่นข้อเสนอของผู้รับเหมา หากหมดเขต
                ระบบจะปิดการยื่นอัตโนมัติ
              </p>
              <div className="flex gap-3 items-end">
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
              <p className="text-xs text-gray-400 mt-2">
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

          {/* แถว: กราฟ (placeholder) */}
          <Card>
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold text-gray-800">รายรับ vs รายจ่าย</h3>
              <span className="text-xs text-gray-500">
                ในรอบ 30 วันที่ผ่านมา
              </span>
            </div>
            <div className="h-56 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500">
              กราฟแสดงข้อมูล (placeholder)
            </div>
          </Card>

          {/* แถว: กิจกรรมล่าสุด + ข้อเสนอ + สรุปเก็บเกี่ยว */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mt-4">
            {/* กิจกรรมล่าสุด */}
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

            {/* ข้อเสนอจากผู้รับเหมา */}
            <Card>
              <h3 className="font-semibold text-gray-800 mb-3">
                ข้อเสนอจากผู้รับเหมา
              </h3>
              <div className="space-y-2">
                {offers.map((o, idx) => (
                  <Card key={idx}>
                    <div>
                      <div className="font-medium text-gray-800">
                        {o.broker}
                      </div>
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
              <p className="text-xs text-gray-400 mt-2">
                * ปุ่มยังไม่เชื่อมระบบ
              </p>
            </Card>

            {/* สรุปการเก็บเกี่ยว */}
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
