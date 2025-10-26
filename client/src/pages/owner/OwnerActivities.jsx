// src/pages/owner/OwnerActivities.jsx
import React, { useMemo, useState } from "react";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import Card from "../../components/Card";
import { FaMagnifyingGlass } from "react-icons/fa6";


export default function OwnerActivities() {
  // ── ข้อมูลตัวอย่าง ──────────────────────────────────
  const activities = [
    {
      id: 1,
      category: "ปัญหาภาพรวม",   // จะโชว์เป็น badge มุมขวา
      title: "กิจกรรมโดย",
      recordedAt: "2025-09-20T11:43:59",
      treeId: "-",
      email: "name@email.com",
      phone: "081-234-5678",
      address: "bangkok",
      detail: "test test",
    },
    {
      id: 2,
      category: "ปัญหาภาพรวม",
      title: "กิจกรรมโดย",
      recordedAt: "2025-09-20T11:43:59",
      treeId: "-",
      email: "name@email.com",
      phone: "081-234-5678",
      address: "bangkok",
      detail: "test test",
    },
    // เพิ่มได้เรื่อย ๆ ...
  ];

  // ── ค้นหา ────────────────────────────────────────────
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const k = q.trim().toLowerCase();
    if (!k) return activities;
    return activities.filter((a) =>
      `${a.category} ${a.title} ${a.treeId} ${a.email} ${a.phone} ${a.address} ${a.detail}`
        .toLowerCase()
        .includes(k)
    );
  }, [q, activities]);

  // ── Helpers ─────────────────────────────────────────
  const fmt = (iso) =>
    new Date(iso).toLocaleString("th-TH", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

  const Badge = ({ text }) => {
    const cls =
      text === "ปัญหาภาพรวม"
        ? "bg-rose-100 text-rose-700"
        : "bg-emerald-100 text-emerald-700";
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${cls}`}>
        {text}
      </span>
    );
  };

  const InfoRow = ({ label, value }) => (
    <div>
      <div className="text-slate-500">{label}</div>
      <div className="font-medium">{value || "-"}</div>
    </div>
  );

  // ── UI ──────────────────────────────────────────────
  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-900 flex">
      {/* Sidebar */}
      <div className="hidden md:block w-56 lg:w-64 shrink-0 sticky top-0 h-screen bg-white shadow-md">
        <Sidebar />
      </div>

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        <Header
          title="กิจกรรมที่ผู้รับเหมาบันทึก"
          subtitle="ติดตามงานที่เกิดขึ้นในสวนจากผู้รับเหมา"
          name="สมชาย เข้มแข็ง"
          role="เจ้าของสวน"
        />

        <main className="p-4 sm:p-6 space-y-4">
          {/* ค้นหา */}
          <div className="flex justify-end">
            <div className="relative w-full sm:w-80">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="ค้นหา ประเภท/Tree/อีเมล/ที่อยู่/รายละเอียด…"
                className="w-full rounded-lg border px-3 py-2 pl-9 bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <FaMagnifyingGlass />
              </span>
            </div>
          </div>

          {/* การ์ดกิจกรรมหลายใบ */}
          <div className="max-w-5xl mx-auto space-y-6">
            {filtered.length === 0 ? (
              <div className="text-center text-slate-500 py-8 bg-white rounded-lg border shadow-sm">
                ไม่พบบันทึกกิจกรรมที่ตรงกับคำค้นหา
              </div>
            ) : (
              filtered
                .sort((a, b) => (a.recordedAt < b.recordedAt ? 1 : -1))
                .map((a) => (
                  <Card key={a.id}>
                    {/* หัวเรื่อง + badge */}
                    <div className="flex items-start justify-between">
                      <div>
                        <h2 className="text-lg font-semibold text-slate-800">
                          {a.title}
                        </h2>
                        <p className="text-sm text-slate-600">
                          บันทึกเมื่อ {fmt(a.recordedAt)}
                        </p>
                      </div>
                      <Badge text={a.category} />
                    </div>

                    {/* 2 คอลัมน์ข้อมูลบน */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 text-sm">
                      <div className="space-y-4">
                        <InfoRow label="TREE ID" value={a.treeId} />
                        <InfoRow label="อีเมล" value={a.email} />
                        <InfoRow label="ที่อยู่" value={a.address} />
                      </div>
                      <div className="space-y-4">
                        <InfoRow label="เบอร์ติดต่อ" value={a.phone} />
                      </div>
                    </div>

                    {/* รายละเอียดกิจกรรม */}
                    <div className="mt-5">
                      <label className="block text-sm text-slate-600 mb-1">
                        รายละเอียดกิจกรรม
                      </label>
                      <div className="bg-slate-100 rounded-lg px-3 py-3 min-h-[64px] text-sm text-slate-800">
                        {a.detail || "—"}
                      </div>
                    </div>
                  </Card>
                ))
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
