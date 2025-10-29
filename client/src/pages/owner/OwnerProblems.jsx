// src/pages/owner/OwnerProblems.jsx
import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "../../components/Sidebar";
import HeaderWrapper from "../../components/HeaderWrapper";
import Card from "../../components/Card";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

import { listProblems, ownerAssignNoteAndSetPending } from "../../api/problems";

export default function OwnerProblems() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (!user || user.role !== "owner") navigate("/login");
  }, [user, navigate]);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState(""); // "", "รายต้น", "ทั้งสวน"
  const [noteMap, setNoteMap] = useState({}); // { id: draftNote }

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const all = listProblems();
        if (!alive) return;
        setRows(all);
      } catch (e) {
        if (!alive) return;
        setErr(e?.message || "โหลดรายการปัญหาไม่สำเร็จ");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // แยกประเภทจาก description ที่ broker ใส่ prefix ไว้ เช่น "[รายต้น] ใบไหม้..."
  const parseType = (desc = "") => {
    if (desc.startsWith("[รายต้น]")) return "รายต้น";
    if (desc.startsWith("[ทั้งสวน]")) return "ทั้งสวน";
    return "-";
  };
  const stripTypePrefix = (desc = "") => String(desc).replace(/^\[(รายต้น|ทั้งสวน)\]\s*/u, "");

  const filtered = useMemo(() => {
    const k = q.trim().toLowerCase();
    return rows.filter((p) => {
      const text = `${p.id} ${p.tree_id ?? ""} ${p.description ?? ""} ${p.owner_note ?? ""} ${p.status ?? ""}`.toLowerCase();
      const hitQ = k ? text.includes(k) : true;
      const tp = parseType(p.description);
      const hitType = typeFilter ? tp === typeFilter : true;
      return hitQ && hitType;
    });
  }, [rows, q, typeFilter]);

  const setPending = (id) => {
    const note = noteMap[id]?.trim() || "";
    // อนุญาตให้เว้นว่างได้ แต่ถามยืนยันก่อน
    if (!note) {
      if (!window.confirm("ไม่ใส่โน้ตตอนมอบหมายใช่ไหม?")) return;
    }
    const rec = ownerAssignNoteAndSetPending(id, note); // → สถานะ “ระหว่างแก้ไข”
    setRows((r) => r.map((x) => (x.id === id ? rec : x)));
    setNoteMap((m) => ({ ...m, [id]: "" }));
  };

  const badge = (status) => {
    const cls =
      status === "เปิดปัญหา"
        ? "bg-rose-100 text-rose-700"
        : status === "ระหว่างแก้ไข"
        ? "bg-amber-100 text-amber-700"
        : "bg-emerald-100 text-emerald-700";
    return <span className={`px-3 py-1 rounded-lg text-xs font-medium ${cls}`}>{status}</span>;
  };

  const fmtDT = (iso) =>
    iso ? new Date(iso).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" }) : "-";

  return (
    <div
      className={`min-h-screen w-full bg-slate-50 text-slate-900 flex flex-col md:flex-row ${
        isSidebarOpen ? "overflow-hidden md:overflow-auto" : ""
      }`}
    >
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <HeaderWrapper
          onMenuClick={() => setIsSidebarOpen(true)}
          title="จัดการปัญหาในสวน"
          subtitle="อ่านรายงานจากนายหน้า—มอบหมายงานและติดตามสถานะ"
        />

        <main className="p-4 sm:p-6 pt-28">
          <div className="max-w-6xl mx-auto space-y-4">
            {/* แถบค้นหา + ฟิลเตอร์ประเภท */}
            <Card>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-sm text-slate-600 mb-1">ค้นหา</label>
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="ค้นหา #ไอดี / ต้นไม้ / สถานะ / โน้ต"
                    className="w-full border rounded-lg px-3 py-2 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-1">ประเภท</label>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 bg-white"
                  >
                    <option value="">ทั้งหมด</option>
                    <option value="รายต้น">รายต้น</option>
                    <option value="ทั้งสวน">ทั้งสวน</option>
                  </select>
                </div>
              </div>
            </Card>

            {/* ตารางรายการ */}
            {loading ? (
              <Card>กำลังโหลด…</Card>
            ) : err ? (
              <Card className="text-rose-600">{err}</Card>
            ) : filtered.length === 0 ? (
              <Card>ยังไม่มีรายการปัญหา</Card>
            ) : (
              <Card>
                <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left bg-slate-50 text-slate-600">
                        <th className="py-2 px-3">#</th>
                        <th className="py-2 px-3">ประเภท</th>
                        <th className="py-2 px-3">ต้นทุเรียน</th>
                        <th className="py-2 px-3">รายละเอียดจากนายหน้า</th>
                        <th className="py-2 px-3">สถานะ</th>
                        <th className="py-2 px-3">แนวทางแก้ (Owner)</th>
                        <th className="py-2 px-3">อัปเดตล่าสุด</th>
                        <th className="py-2 px-3">การกระทำ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((p, i) => (
                        <tr key={p.id} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
                          <td className="py-2 px-3">{p.id.slice(0, 8)}</td>
                          <td className="py-2 px-3">{parseType(p.description)}</td>
                          <td className="py-2 px-3">{p.tree_id || "-"}</td>
                          <td className="py-2 px-3">{stripTypePrefix(p.description)}</td>
                          <td className="py-2 px-3">{badge(p.status)}</td>
                          <td className="py-2 px-3">
                            <input
                              value={noteMap[p.id] ?? p.owner_note ?? ""}
                              onChange={(e) => setNoteMap((m) => ({ ...m, [p.id]: e.target.value }))}
                              placeholder="พิมพ์แนวทางแก้/มอบหมายงาน"
                              className="w-64 border rounded-lg px-2 py-1"
                            />
                          </td>
                          <td className="py-2 px-3">{fmtDT(p.updated_at || p.created_at)}</td>
                          <td className="py-2 px-3">
                            {p.status === "เปิดปัญหา" ? (
                              <button
                                onClick={() => setPending(p.id)}
                                className="px-3 py-1 rounded-lg text-white text-xs bg-amber-700 hover:bg-amber-800"
                              >
                                มอบหมายเป็น “ระหว่างแก้ไข”
                              </button>
                            ) : (
                              <span className="text-slate-400 text-xs">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
