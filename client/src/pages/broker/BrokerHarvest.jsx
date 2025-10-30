// src/pages/broker/BrokerHarvest.jsx
import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "../../components/Sidebar";
import HeaderWrapper from "../../components/HeaderWrapper";
import Card from "../../components/Card";
import PageHeader from "../../components/PageHeader";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  GRADES,
  listFruitsByBrokerHarvestOnly,
  listFruitsByDateRangeHarvestOnly,
  createHarvestFruitRecord,
} from "../../api/fruits";

export default function BrokerHarvest() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (!user || user.role !== "broker") navigate("/login");
  }, [user, navigate]);

  // ─────────── State ───────────
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [gradeFilter, setGradeFilter] = useState("ทั้งหมด");
  const [q, setQ] = useState("");
  const [form, setForm] = useState({ grade: "A", weight_kg: "", note: "" });

  // ─────────── โหลดข้อมูล ───────────
  useEffect(() => {
    let alive = true;
    try {
      const data = listFruitsByBrokerHarvestOnly(user?.broker_id);
      if (alive) setRows(data);
    } catch (e) {
      if (alive) setErr(e?.message || "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
    return () => {
      alive = false;
    };
  }, [user?.broker_id]);

  // ─────────── เพิ่มข้อมูลเก็บเกี่ยว ───────────
  const add = () => {
    try {
      const w = Number(form.weight_kg);
      if (!w || w <= 0) return alert("กรุณาระบุน้ำหนักที่ถูกต้อง");

      const rec = createHarvestFruitRecord({
        broker_id: user?.broker_id,
        grade: form.grade,
        weight_kg: w,
        note: form.note?.trim(),
      });
      setRows((prev) => [rec, ...prev]);
      setForm({ grade: "A", weight_kg: "", note: "" });
      alert("บันทึกผลผลิตเรียบร้อย");
    } catch (e) {
      alert(e?.message || "เกิดข้อผิดพลาดในการบันทึก");
    }
  };

  // ─────────── ฟังก์ชันกรอง ───────────
  const filtered = useMemo(() => {
    let list = rows;
    if (startDate || endDate) {
      list = listFruitsByDateRangeHarvestOnly({
        startISO: startDate ? new Date(startDate).toISOString() : undefined,
        endISO: endDate ? new Date(endDate + "T23:59:59").toISOString() : undefined,
      }).filter((r) => String(r.broker_id) === String(user?.broker_id));
    }
    if (gradeFilter !== "ทั้งหมด")
      list = list.filter((x) => x.grade === gradeFilter);

    const k = q.trim().toLowerCase();
    if (!k) return list;
    return list.filter((x) =>
      `${x.grade} ${x.note ?? ""}`.toLowerCase().includes(k)
    );
  }, [rows, startDate, endDate, gradeFilter, q, user?.broker_id]);

  // ─────────── รวมยอดตามเกรด ───────────
  const totals = useMemo(() => {
    const byGrade = Object.fromEntries(GRADES.map((g) => [g, { weight_kg: 0 }]));
    filtered.forEach((r) => {
      if (byGrade[r.grade]) byGrade[r.grade].weight_kg += Number(r.weight_kg || 0);
    });
    const sumWeight = Object.values(byGrade).reduce(
      (s, g) => s + g.weight_kg,
      0
    );
    return { sumWeight, byGrade };
  }, [filtered]);

  const fmtDT = (iso) =>
    new Date(iso).toLocaleString("th-TH", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

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
          title="บันทึกผลผลิต (ผู้รับเหมา)"
          subtitle="บันทึกและดูข้อมูลผลผลิตทุเรียนของคุณ"
        />

        <main className="p-4 sm:p-6 pt-28">
          <div className="max-w-5xl mx-auto space-y-4">
            {err && <Card className="text-rose-600">{err}</Card>}

            {/* ฟอร์มบันทึกผลผลิต */}
            <Card>
              <h3 className="font-semibold mb-2">เพิ่มข้อมูลผลผลิตใหม่</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-sm text-slate-600 mb-1">
                    เกรด
                  </label>
                  <select
                    value={form.grade}
                    onChange={(e) => setForm((f) => ({ ...f, grade: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 bg-white"
                  >
                    {GRADES.map((g) => (
                      <option key={g} value={g}>
                        {g === "ตกเกรด" ? g : `เกรด ${g}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-slate-600 mb-1">
                    น้ำหนัก (กก.)
                  </label>
                  <input
                    type="number"
                    value={form.weight_kg}
                    onChange={(e) => setForm((f) => ({ ...f, weight_kg: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 bg-white"
                    placeholder="เช่น 120"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm text-slate-600 mb-1">
                    หมายเหตุ
                  </label>
                  <input
                    value={form.note}
                    onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 bg-white"
                    placeholder="เช่น แปลง B แถว 2"
                  />
                </div>
              </div>

              <button
                onClick={add}
                className="mt-3 px-4 py-2 rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 text-sm"
              >
                บันทึกผลผลิต
              </button>
            </Card>

            {/* ฟิลเตอร์ */}
            <Card>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-sm text-slate-600 mb-1">
                    วันที่เริ่ม
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 bg-white"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm text-slate-600 mb-1">
                    วันที่สิ้นสุด
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-1">เกรด</label>
                  <select
                    value={gradeFilter}
                    onChange={(e) => setGradeFilter(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 bg-white"
                  >
                    <option value="ทั้งหมด">ทั้งหมด</option>
                    {GRADES.map((g) => (
                      <option key={g} value={g}>
                        {g === "ตกเกรด" ? g : `เกรด ${g}`}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-5">
                  <label className="block text-sm text-slate-600 mb-1">ค้นหา</label>
                  <input
                    type="text"
                    placeholder="ค้นหาด้วยหมายเหตุ / เกรด"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 bg-white"
                  />
                </div>
              </div>
            </Card>

            {/* สรุปผลผลิต */}
            <Card>
              <PageHeader
                title="สรุปรวมผลผลิต"
                subtitle="น้ำหนักรวม (กก.) ตามเกรด"
              />
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                <SummaryBox
                  label="น้ำหนักรวมทั้งหมด"
                  value={totals.sumWeight.toLocaleString("th-TH")}
                  subtitle="กิโลกรัม"
                />
                {GRADES.map((g) => (
                  <SummaryBox
                    key={g}
                    label={g === "ตกเกรด" ? "ตกเกรด (กก.)" : `เกรด ${g} (กก.)`}
                    value={totals.byGrade[g].weight_kg.toLocaleString("th-TH")}
                  />
                ))}
              </div>
            </Card>

            {/* ตาราง */}
            <Card>
              {loading ? (
                <div className="text-sm text-slate-500">กำลังโหลด…</div>
              ) : filtered.length === 0 ? (
                <div className="text-sm text-slate-600">ยังไม่มีข้อมูลผลผลิต</div>
              ) : (
                <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left bg-slate-50 text-slate-600">
                        <th className="py-2 px-3">เวลา</th>
                        <th className="py-2 px-3">เกรด</th>
                        <th className="py-2 px-3">น้ำหนัก (กก.)</th>
                        <th className="py-2 px-3">หมายเหตุ</th>
                        <th className="py-2 px-3">#ไอดี</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((r, i) => (
                        <tr
                          key={r.id}
                          className={i % 2 === 0 ? "bg-white" : "bg-slate-50/60"}
                        >
                          <td className="py-2 px-3">{fmtDT(r.harvest_at)}</td>
                          <td className="py-2 px-3">
                            {r.grade === "ตกเกรด" ? r.grade : `เกรด ${r.grade}`}
                          </td>
                          <td className="py-2 px-3">
                            {Number(r.weight_kg).toLocaleString("th-TH")}
                          </td>
                          <td className="py-2 px-3">{r.note || "-"}</td>
                          <td className="py-2 px-3 text-slate-500">
                            {r.id.slice(0, 8)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}

function SummaryBox({ label, value, subtitle }) {
  return (
    <div className="rounded-xl border bg-white p-4 text-center">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
      {subtitle && <div className="text-xs text-slate-500 mt-1">{subtitle}</div>}
    </div>
  );
}
