// src/pages/owner/OwnerHarvest.jsx
import React, { useMemo, useState } from "react";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import Card from "../../components/Card";
import { FaMagnifyingGlass } from "react-icons/fa6";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import HeaderWrapper from "../../components/HeaderWrapper";

export default function OwnerHarvest() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (!user || user.role !== "owner") {
      navigate("/login");
    }
  }, [user, navigate]);
  const [q, setQ] = useState("");

  // ข้อมูล mock “รายการบันทึกล่าสุด”
  const rows = [
    {
      id: 1,
      datetime: "2025-09-26T11:43:35",
      user: "jame",
      grade: "เกรดB",
      qty: 100,
    },
    {
      id: 2,
      datetime: "2025-09-26T15:23:45",
      user: "jame",
      grade: "ตกเกรด",
      qty: 200,
    },
  ];

  // ฟิลเตอร์ตามคำค้นหา (ค้นหาทุกคอลัมน์)
  const filtered = rows.filter((r) => {
    const d = new Date(r.datetime).toLocaleString("th-TH", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    const hay = `${d} ${r.user} ${r.grade} ${r.qty}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  });

  // สรุปการ์ดบน (รวมจากข้อมูลทั้งหมด ไม่ขึ้นกับการค้นหา)
  const summary = useMemo(() => {
    const init = { A: 0, B: 0, C: 0, W: 0 };
    rows.forEach((r) => {
      if (r.grade === "เกรดA") init.A += r.qty;
      else if (r.grade === "เกรดB") init.B += r.qty;
      else if (r.grade === "เกรดC") init.C += r.qty;
      else init.W += r.qty;
    });
    return init;
  }, [rows]);

  const badge = (grade) => {
    const map = {
      เกรดA: "bg-emerald-100 text-emerald-700",
      เกรดB: "bg-lime-100 text-lime-700",
      เกรดC: "bg-amber-100 text-amber-700",
      ตกเกรด: "bg-rose-100 text-rose-700",
    };
    return `px-2 py-0.5 rounded-full text-xs ${
      map[grade] || "bg-slate-100 text-slate-700"
    }`;
  };

  const fmtDate = (iso) =>
    new Date(iso).toLocaleString("th-TH", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

  const totalFiltered = filtered.reduce((a, b) => a + b.qty, 0);

  const StatCard = ({ label, value, color }) => (
    <div
      className={`rounded-2xl border-2 shadow-sm bg-white px-6 py-5 text-center
                ${color.border} ${color.text}`}
    >
      <div className="text-sm font-medium">{label}</div>
      <div className="mt-1 text-3xl font-semibold">
        {value.toLocaleString("th-TH")}
      </div>
      <div className="text-sm text-slate-600 mt-1">ลูก</div>
    </div>
  );

  return (
    <div
      className={`min-h-screen w-full bg-slate-50 text-slate-900 flex flex-col md:flex-row ${
        isSidebarOpen ? "overflow-hidden md:overflow-auto" : ""
      }`}
    >
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <HeaderWrapper
          onMenuClick={() => setIsSidebarOpen(true)}
          title="สรุปผลการเก็บเกี่ยวทุเรียน"
          subtitle="ดูจำนวนผลผลิตที่เก็บได้ในแต่ละเกรดเพื่อวางแผนการขาย"
        />
        <main className="p-4 sm:p-6 pt-28 space-y-6">
          {/* การ์ดสรุป 4 ใบ */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="เกรดA"
              value={summary.A}
              color={{ border: "border-emerald-500", text: "text-emerald-700" }}
            />
            <StatCard
              label="เกรดB"
              value={summary.B}
              color={{ border: "border-lime-500", text: "text-lime-700" }}
            />
            <StatCard
              label="เกรดC"
              value={summary.C}
              color={{ border: "border-amber-500", text: "text-amber-700" }}
            />
            <StatCard
              label="ตกเกรด"
              value={summary.W}
              color={{ border: "border-rose-500", text: "text-rose-700" }}
            />
          </div>

          {/* กล่อง “ข้อมูลการบันทึกล่าสุด” + ค้นหา */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-800">
                ข้อมูลการบันทึกล่าสุด
              </h3>
              <div className="relative w-56">
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="ค้นหา..."
                  className="w-full rounded-lg border px-3 py-2 pl-9 bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <FaMagnifyingGlass />
                </span>
              </div>
            </div>

            {/* ตาราง */}
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-600 bg-emerald-50">
                    <th className="py-2 px-3 rounded-l-lg">วันที่บันทึก</th>
                    <th className="py-2 px-3">ผู้บันทึก</th>
                    <th className="py-2 px-3">เกรด</th>
                    <th className="py-2 px-3 rounded-r-lg">จำนวน(ลูก)</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, i) => (
                    <tr
                      key={r.id}
                      className={i % 2 ? "bg-white" : "bg-slate-50/60"}
                    >
                      <td className="py-2 px-3">{fmtDate(r.datetime)}</td>
                      <td className="py-2 px-3">{r.user}</td>
                      <td className="py-2 px-3">
                        <span className={badge(r.grade)}>{r.grade}</span>
                      </td>
                      <td className="py-2 px-3 tabular-nums">
                        {r.qty.toLocaleString("th-TH")}
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="py-8 text-center text-slate-500"
                      >
                        ไม่พบรายการที่ตรงกับคำค้นหา
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* รวมทั้งหมด */}
            <div className="mt-3 text-right text-sm">
              รวมทั้งหมด :{" "}
              <span className="font-semibold">
                {totalFiltered.toLocaleString("th-TH")} ลูก
              </span>
            </div>
          </Card>
        </main>
      </div>
    </div>
  );
}
