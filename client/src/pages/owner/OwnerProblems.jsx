// src/pages/owner/OwnerProblems.jsx
import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "../../components/Sidebar";
import HeaderWrapper from "../../components/HeaderWrapper";
import Card from "../../components/Card";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

import {
  listProblems,
  ownerAssignNoteAndSetPending,
} from "../../api/problems";

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
  const [noteMap, setNoteMap] = useState({}); // { id: noteDraft }

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

  const filtered = useMemo(() => {
    const k = q.trim().toLowerCase();
    if (!k) return rows;
    return rows.filter((p) =>
      `${p.id} ${p.tree_id} ${p.description} ${p.owner_note} ${p.status}`
        .toLowerCase()
        .includes(k)
    );
  }, [rows, q]);

  const setPending = (id) => {
    const note = noteMap[id]?.trim() || "";
    if (!note) {
      if (!window.confirm("ไม่ใส่โน้ตตอนมอบหมายใช่ไหม?")) return;
    }
    const rec = ownerAssignNoteAndSetPending(id, note);
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
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-600">
                ทั้งหมด {rows.length} รายการ
              </div>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="ค้นหา #ไอดี / ต้นไม้ / สถานะ / โน้ต"
                className="w-72 border rounded-lg px-3 py-2 bg-white"
              />
            </div>

            {loading ? (
              <Card>กำลังโหลด…</Card>
            ) : err ? (
              <Card className="text-rose-600">{err}</Card>
            ) : filtered.length === 0 ? (
              <Card className="text-slate-600 text-sm">ยังไม่มีรายการ</Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filtered.map((p) => (
                  <Card key={p.id} className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-lg">
                          #{p.id.slice(0, 8)} • ต้น {p.tree_id}
                        </div>
                        <div className="text-sm text-slate-600">
                          สร้างเมื่อ {fmtDT(p.created_at)}{" "}
                          {p.updated_at ? `• อัปเดตล่าสุด ${fmtDT(p.updated_at)}` : ""}
                        </div>
                      </div>
                      {badge(p.status)}
                    </div>

                    <div className="text-sm">
                      <div className="text-slate-500">รายละเอียด</div>
                      <div className="font-medium">{p.description}</div>
                    </div>

                    <div className="text-sm">
                      <div className="text-slate-500">โน้ตจากเจ้าของสวน</div>
                      <div className="font-medium">{p.owner_note || "-"}</div>
                    </div>

                    {/* มอบหมาย/ตั้งสถานะระหว่างแก้ไข */}
                    {p.status === "เปิดปัญหา" && (
                      <div className="rounded-lg border bg-slate-50 p-3">
                        <label className="block text-sm text-slate-600 mb-1">
                          โน้ตถึงนายหน้า (ตัวอย่าง: แนบรูปหลังแก้ไข / ติดต่อภายใน 24 ชม.)
                        </label>
                        <input
                          value={noteMap[p.id] ?? ""}
                          onChange={(e) =>
                            setNoteMap((m) => ({ ...m, [p.id]: e.target.value }))
                          }
                          className="w-full border rounded-lg px-3 py-2 bg-white"
                          placeholder="พิมพ์โน้ต..."
                        />
                        <button
                          onClick={() => setPending(p.id)}
                          className="mt-2 px-3 py-2 rounded-lg text-white bg-amber-700 hover:bg-amber-800 text-sm"
                        >
                          ➡️ มอบหมาย/ตั้งสถานะ “ระหว่างแก้ไข”
                        </button>
                      </div>
                    )}

                    {p.status === "ระหว่างแก้ไข" && (
                      <div className="text-xs text-slate-500">
                        * รอนายหน้ายืนยัน “แก้ไขแล้ว”
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
