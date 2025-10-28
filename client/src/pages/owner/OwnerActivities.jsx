// src/pages/owner/OwnerActivities.jsx
import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "../../components/Sidebar";
import HeaderWrapper from "../../components/HeaderWrapper";
import Card from "../../components/Card";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

import { listActivitiesForOwner } from "../../api/activities";
import { listTrees, seedTreesIfEmpty } from "../../api/trees";

export default function OwnerActivities() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (!user || user.role !== "owner") navigate("/login");
  }, [user, navigate]);

  // ────────────────────────────────
  const [rows, setRows] = useState([]);
  const [trees, setTrees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        seedTreesIfEmpty();
        const acts = listActivitiesForOwner();
        const t = listTrees();
        if (!alive) return;
        setRows(
          acts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        );
        setTrees(t);
      } catch (e) {
        if (!alive) return;
        setErr(e?.message || "โหลดกิจกรรมไม่สำเร็จ");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // ────────────────────────────────
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState("ทั้งหมด");
  const typeOptions = [
    "ทั้งหมด",
    "รดน้ำ",
    "ใส่ปุ๋ย",
    "ตัดหญ้า",
    "ฉีดพ่น",
    "ตรวจสุขภาพ",
    "อื่นๆ",
  ];

  const filtered = useMemo(() => {
    let list = rows;
    if (typeFilter !== "ทั้งหมด") {
      list = list.filter((a) => a.type === typeFilter);
    }
    const k = q.trim().toLowerCase();
    if (!k) return list;
    return list.filter((a) =>
      `${a.id} ${a.tree_id} ${a.type} ${a.note}`
        .toLowerCase()
        .includes(k)
    );
  }, [rows, q, typeFilter]);

  const fmtDT = (iso) =>
    new Date(iso).toLocaleString("th-TH", {
      dateStyle: "medium",
      timeStyle: "short",
    });

  const findTreeName = (id) =>
    trees.find((t) => t.id === id)?.name || "-";

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
          title="บันทึกกิจกรรมในสวน"
          subtitle="รวมกิจกรรมทั้งหมดจากนายหน้าที่บันทึกไว้ในระบบ"
        />

        <main className="p-4 sm:p-6 pt-28">
          <div className="max-w-6xl mx-auto space-y-4">
            {/* แผงค้นหา/กรอง */}
            <Card>
              <div className="flex flex-col md:flex-row md:items-center gap-3 md:justify-between">
                <div className="text-sm text-slate-600">
                  ทั้งหมด {rows.length} รายการ
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="border rounded-lg px-3 py-2 bg-white"
                  >
                    {typeOptions.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="ค้นหา #ไอดี / ต้นไม้ / ประเภท / หมายเหตุ"
                    className="border rounded-lg px-3 py-2 bg-white w-64"
                  />
                </div>
              </div>
            </Card>

            {/* ตารางกิจกรรม */}
            <Card>
              {loading ? (
                <div className="text-sm text-slate-500">กำลังโหลดข้อมูล...</div>
              ) : err ? (
                <div className="text-sm text-rose-600">{err}</div>
              ) : filtered.length === 0 ? (
                <div className="text-sm text-slate-600">ยังไม่มีข้อมูลกิจกรรม</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left border-b">
                        <th className="py-2 pr-4">เวลา</th>
                        <th className="py-2 pr-4">ต้นไม้</th>
                        <th className="py-2 pr-4">กิจกรรม</th>
                        <th className="py-2 pr-4">หมายเหตุ</th>
                        <th className="py-2 pr-4">นายหน้า</th>
                        <th className="py-2 pr-4">#ไอดี</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((r) => (
                        <tr key={r.id} className="border-b">
                          <td className="py-2 pr-4">{fmtDT(r.created_at)}</td>
                          <td className="py-2 pr-4">
                            {r.tree_id} — {findTreeName(r.tree_id)}
                          </td>
                          <td className="py-2 pr-4">{r.type}</td>
                          <td className="py-2 pr-4">{r.note || "-"}</td>
                          <td className="py-2 pr-4">{r.broker_id ?? "-"}</td>
                          <td className="py-2 pr-4 text-slate-500">
                            {r.id.slice(0, 8)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="text-xs text-slate-400 mt-2">
                * ข้อมูลนี้รวมทุกนายหน้าที่บันทึกผ่านระบบ mock API
              </p>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
