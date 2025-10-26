// src/pages/owner/OwnerTreeStatus.jsx
import React, { useMemo, useState } from "react";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import Card from "../../components/Card";
import { FaMagnifyingGlass } from "react-icons/fa6";


export default function OwnerTreeStatus() {
  const [q, setQ] = useState("");

  // mock data
  const trees = [
    { id: "T-001", status: "ปกติ",   note: "ต้นสมบูรณ์ดี" },
    { id: "T-012", status: "ปกติ",   note: "มีการแตกยอดใหม่" },
    { id: "T-032", status: "ออกดอก", note: "เริ่มบานตามกำหนด" },
    { id: "T-015", status: "มีปัญหา", note: "พบอาการใบไหม้ ต้องตรวจสวนเพิ่มเติม" },
    { id: "T-042", status: "ออกผล",  note: "ผลโตใกล้ตัดแล้ว" },
  ];

  const statusStyle = {
    ปกติ:     "bg-green-100 text-green-700",
    มีปัญหา:  "bg-rose-100 text-rose-700",
    ออกดอก:   "bg-sky-100 text-sky-700",
    ออกผล:    "bg-amber-100 text-amber-700",
  };

  const summary = useMemo(() => {
    const counts = { ปกติ: 0, มีปัญหา: 0, ออกดอก: 0, ออกผล: 0 };
    trees.forEach(t => counts[t.status]++);
    return [
      { label: "ปกติ", count: counts["ปกติ"],    cls: "bg-green-100 text-green-700" },
      { label: "มีปัญหา", count: counts["มีปัญหา"], cls: "bg-rose-100 text-rose-700" },
      { label: "ออกดอก", count: counts["ออกดอก"],  cls: "bg-sky-100 text-sky-700" },
      { label: "ออกผล", count: counts["ออกผล"],   cls: "bg-amber-100 text-amber-700" },
    ];
  }, []);

  const filtered = trees.filter(
    (t) =>
      t.id.toLowerCase().includes(q.toLowerCase()) ||
      t.status.toLowerCase().includes(q.toLowerCase()) ||
      t.note.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-900 flex">
      {/* Sidebar */}
      <div className="hidden md:block w-56 lg:w-64 shrink-0 sticky top-0 h-screen bg-white shadow-md">
        <Sidebar />
      </div>

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        <Header
          title="สถานะต้นทุเรียนในสวน"
          subtitle="ติดตามสุขภาพต้นทุเรียนและวางแผนจัดการได้ตลอดเวลา"
          name="สมชาย เข้มแข็ง"
          role="เจ้าของสวน"
        />

        <main className="p-4 sm:p-6 space-y-4">
          {/* สรุป 4 การ์ด */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {summary.map((s) => (
              <div key={s.label} className={`rounded-2xl shadow-sm bg-white`}>
                <div className={`px-4 py-5 rounded-2xl ${s.cls.replace("text-", "border-")} `}>
                  <div className={`text-sm ${s.cls.split(" ")[1]}`}>{s.label}</div>
                  <div className="mt-1 text-2xl font-semibold">{s.count} ต้น</div>
                </div>
              </div>
            ))}
          </div>

          {/* แถว: กล่องค้นหา (ขวาบน) */}
          <div className="flex items-center justify-end">
            <div className="relative w-full sm:w-72">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="ค้นหา Tree ID / สถานะ / หมายเหตุ"
                className="w-full rounded-lg border px-3 py-2 pl-10 bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><FaMagnifyingGlass /></span>
            </div>
          </div>

          {/* ตารางรายการต้น */}
          <Card>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-600 bg-emerald-50">
                    <th className="py-2 px-3 rounded-l-lg">Tree ID</th>
                    <th className="py-2 px-3">สถานะ</th>
                    <th className="py-2 px-3 rounded-r-lg">หมายเหตุ</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t, i) => (
                    <tr key={t.id} className={`border-t ${i % 2 ? "bg-white" : "bg-slate-50/60"}`}>
                      <td className="py-2 px-3 font-medium text-slate-800">{t.id}</td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-1 rounded-full ${statusStyle[t.status]} text-xs`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-700">{t.note}</td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-slate-500">
                        ไม่พบรายการที่ตรงกับคำค้นหา
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </main>
      </div>
    </div>
  );
}
