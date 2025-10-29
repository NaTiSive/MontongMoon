// src/pages/owner/OwnerHarvest.jsx
import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "../../components/Sidebar";
import HeaderWrapper from "../../components/HeaderWrapper";
import Card from "../../components/Card";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

import { GRADES, listFruits, listFruitsByDateRange } from "../../api/fruits";

export default function OwnerHarvest() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (!user || user.role !== "owner") navigate("/login");
  }, [user, navigate]);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // ฟิลเตอร์วันที่
  const todayISO = new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const all = listFruits();
        if (!alive) return;
        setRows(all);
      } catch (e) {
        if (!alive) return;
        setErr(e?.message || "โหลดข้อมูลไม่สำเร็จ");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // กรองตามช่วงวันที่ + เกรด + ค้นหา
  const [gradeFilter, setGradeFilter] = useState("ทั้งหมด");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    let list = rows;

    // date range
    if (startDate || endDate) {
      const byRange = listFruitsByDateRange({
        startISO: startDate ? new Date(startDate).toISOString() : undefined,
        endISO: endDate ? new Date(endDate + "T23:59:59").toISOString() : undefined,
      });
      list = byRange;
    }

    if (gradeFilter !== "ทั้งหมด") list = list.filter((x) => x.grade === gradeFilter);

    const k = q.trim().toLowerCase();
    if (!k) return list;
    return list.filter((x) =>
      `${x.id} ${x.tree_id} ${x.grade} ${x.weight_kg} ${x.count} ${x.note} ${x.broker_id}`
        .toLowerCase()
        .includes(k)
    );
  }, [rows, startDate, endDate, gradeFilter, q]);

  // สรุปยอด
  const totals = useMemo(() => {
    const sumWeight = filtered.reduce((s, r) => s + Number(r.weight_kg || 0), 0);
    const sumCount = filtered.reduce((s, r) => s + Number(r.count || 0), 0);
    const byGrade = GRADES.reduce((acc, g) => {
      const items = filtered.filter((r) => r.grade === g);
      acc[g] = {
        weight_kg: items.reduce((s, r) => s + Number(r.weight_kg || 0), 0),
        count: items.reduce((s, r) => s + Number(r.count || 0), 0),
      };
      return acc;
    }, {});
    return { sumWeight, sumCount, byGrade };
  }, [filtered]);

  const fmtDT = (iso) =>
    new Date(iso).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });

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
          title="ผลการเก็บเกี่ยว (เจ้าของสวน)"
          subtitle="ดูผลผลิตรวมตามเกรด น้ำหนัก จำนวนผล และช่วงเวลา"
        />

        <main className="p-4 sm:p-6 pt-28">
          <div className="max-w-6xl mx-auto space-y-4">
            {/* ฟิลเตอร์ */}
            <Card>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <div>
                  <label className="block text-sm text-slate-600 mb-1">ตั้งแต่วันที่</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 bg-white"
                    max={todayISO}
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-1">ถึงวันที่</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 bg-white"
                    max={todayISO}
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-1">เกรด</label>
                  <select
                    value={gradeFilter}
                    onChange={(e) => setGradeFilter(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 bg-white"
                  >
                    <option>ทั้งหมด</option>
                    {GRADES.map((g) => (
                      <option key={g}>{g}</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm text-slate-600 mb-1">ค้นหา</label>
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="ค้นหา เกรด/ต้นไม้/นายหน้า/หมายเหตุ"
                    className="w-full border rounded-lg px-3 py-2 bg-white"
                  />
                </div>
              </div>
            </Card>

            {/* สรุปยอด */}
            <Card>
              <h3 className="font-semibold mb-3">สรุปยอด</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <SummaryBox label="น้ำหนักรวม (กก.)" value={totals.sumWeight.toLocaleString("th-TH")} />
                <SummaryBox label="จำนวนผลรวม" value={totals.sumCount.toLocaleString("th-TH")} />
                {GRADES.map((g) => (
                  <SummaryBox
                    key={g}
                    label={`เกรด ${g} (กก.)`}
                    value={totals.byGrade[g].weight_kg.toLocaleString("th-TH")}
                    subtitle={`${totals.byGrade[g].count.toLocaleString("th-TH")} ผล`}
                  />
                ))}
              </div>
            </Card>

            {/* ตารางรายการ */}
            <Card>
              {loading ? (
                <div className="text-sm text-slate-500">กำลังโหลด…</div>
              ) : err ? (
                <div className="text-sm text-rose-600">{err}</div>
              ) : filtered.length === 0 ? (
                <div className="text-sm text-slate-600">ยังไม่มีรายการ</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left border-b">
                        <th className="py-2 pr-4">เวลา</th>
                        <th className="py-2 pr-4">นายหน้า</th>
                        <th className="py-2 pr-4">ต้นไม้</th>
                        <th className="py-2 pr-4">เกรด</th>
                        <th className="py-2 pr-4">น้ำหนัก (กก.)</th>
                        <th className="py-2 pr-4">จำนวน (ผล)</th>
                        <th className="py-2 pr-4">หมายเหตุ</th>
                        <th className="py-2 pr-4">#ไอดี</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((r) => (
                        <tr key={r.id} className="border-b">
                          <td className="py-2 pr-4">{fmtDT(r.harvest_at)}</td>
                          <td className="py-2 pr-4">{r.broker_id ?? "-"}</td>
                          <td className="py-2 pr-4">{r.tree_id}</td>
                          <td className="py-2 pr-4">{r.grade}</td>
                          <td className="py-2 pr-4">{r.weight_kg.toLocaleString("th-TH")}</td>
                          <td className="py-2 pr-4">{r.count.toLocaleString("th-TH")}</td>
                          <td className="py-2 pr-4">{r.note || "-"}</td>
                          <td className="py-2 pr-4 text-slate-500">{r.id.slice(0, 8)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="text-xs text-slate-400 mt-2">
                * ข้อมูลนี้เป็น mock — พร้อมสลับไป backend จริงได้ทันทีเมื่อ API พร้อม
              </p>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}

function SummaryBox({ label, value, subtitle }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
      {subtitle && <div className="text-xs text-slate-500 mt-1">{subtitle}</div>}
    </div>
  );
}
