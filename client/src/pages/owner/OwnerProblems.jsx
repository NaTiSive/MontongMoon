// src/pages/owner/OwnerProblems.jsx
import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "../../components/Sidebar";
import HeaderWrapper from "../../components/HeaderWrapper";
import Card from "../../components/Card";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const PROBLEM_KEY = "mm:problems@v1"; // สมมุติว่าฝั่ง broker จะเขียนเข้าคีย์นี้ในอนาคต

export default function OwnerProblems() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (!user || user.role !== "owner") navigate("/login");
  }, [user, navigate]);

  // mock read
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    const raw = JSON.parse(localStorage.getItem(PROBLEM_KEY) || "[]");
    // ตัวอย่าง mock ถ้ายังไม่มีข้อมูล
    const seed = raw.length ? raw : [
      { id: "P-001", treeId: "T-209", title: "ใบไหม้", detail: "พบอาการใบไหม้แถว C", createdAt: "2025-09-25T08:30:00", status: "เปิด" },
      { id: "P-002", treeId: "T-102", title: "เพลี้ย", detail: "พบเพลี้ยปริมาณมาก", createdAt: "2025-09-26T16:12:00", status: "ปิดแล้ว" },
    ];
    setRows(seed);
  }, []);

  const filtered = useMemo(() => {
    const k = q.trim().toLowerCase();
    if (!k) return rows;
    return rows.filter(r =>
      `${r.id} ${r.treeId} ${r.title} ${r.detail} ${r.status}`.toLowerCase().includes(k)
    );
  }, [rows, q]);

  const toggleStatus = (id) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, status: r.status === "เปิด" ? "ปิดแล้ว" : "เปิด" } : r));
  };

  const fmt = (iso) =>
    new Date(iso).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });

  return (
    <div className={`min-h-screen w-full bg-slate-50 text-slate-900 flex flex-col md:flex-row ${isSidebarOpen ? "overflow-hidden md:overflow-auto" : ""}`}>
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      {isSidebarOpen && <div className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={() => setIsSidebarOpen(false)} />}

      <div className="flex-1 min-w-0 flex flex-col">
        <HeaderWrapper
          onMenuClick={() => setIsSidebarOpen(true)}
          title="รายงานปัญหา"
          subtitle="ตรวจสอบ และปิดงานเมื่อแก้ไขแล้ว"
        />
        <main className="p-4 sm:p-6 pt-28">
          <div className="max-w-5xl mx-auto space-y-4">
            <div className="flex justify-end">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="ค้นหา ID/Tree/หัวข้อ/รายละเอียด/สถานะ…"
                className="w-full sm:w-80 border rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            {filtered.length === 0 ? (
              <Card className="text-slate-600">ยังไม่มีรายงานปัญหา</Card>
            ) : (
              filtered
                .slice()
                .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
                .map(r => (
                  <Card key={r.id}>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-lg font-semibold">#{r.id} — {r.title}</div>
                        <div className="text-sm text-slate-600">Tree: {r.treeId} • รายงานเมื่อ {fmt(r.createdAt)}</div>
                      </div>
                      <span className={`px-3 py-1 rounded-lg text-sm font-medium ${
                        r.status === "เปิด" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                      }`}>
                        {r.status}
                      </span>
                    </div>

                    <div className="mt-3 text-sm text-slate-800">{r.detail || "-"}</div>

                    <div className="mt-4">
                      <button
                        onClick={() => toggleStatus(r.id)}
                        className="px-3 py-2 rounded-lg text-white bg-emerald-700 hover:bg-emerald-800 text-sm"
                      >
                        {r.status === "เปิด" ? "ปิดงาน (แก้ไขแล้ว)" : "เปิดงานอีกครั้ง"}
                      </button>
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
