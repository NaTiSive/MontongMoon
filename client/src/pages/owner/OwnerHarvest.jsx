import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "../../components/Sidebar";
import HeaderWrapper from "../../components/HeaderWrapper";
import Card from "../../components/Card";
import PageHeader from "../../components/PageHeader";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  GRADES,
  getHarvestStockSummary,
  listHarvestOnly,
  listFruitsByDateRangeHarvestOnly,
} from "../../api/fruits";
import { listTrees } from "../../api/trees";

const OWNER_GRADE_SUMMARY_TEMPLATE = Object.freeze(
  Object.fromEntries(GRADES.map((grade) => [grade, 0]))
);

const createEmptySummary = () => ({
  sum_weight: 0,
  by_grade: { ...OWNER_GRADE_SUMMARY_TEMPLATE },
});

const normalizeSummary = (raw) => {
  const base = createEmptySummary();
  const source = raw ?? {};
  const normalized = {
    sum_weight: Number(source.sum_weight) || 0,
    by_grade: { ...base.by_grade },
  };

  const map = source.by_grade ?? {};
  for (const grade of GRADES) {
    normalized.by_grade[grade] = Number(map[grade]) || 0;
  }

  return normalized;
};

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
  const [summary, setSummary] = useState(() => createEmptySummary());
  const [trees, setTrees] = useState([]);
  const [loadingTrees, setLoadingTrees] = useState(true);

  // ฟิลเตอร์
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [gradeFilter, setGradeFilter] = useState("ทั้งหมด");
  const [treeFilter, setTreeFilter] = useState("ทั้งหมด");
  const [q, setQ] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoadingTrees(true);
        const data = await listTrees();
        if (!alive) return;
        setTrees(data);
      } catch (e) {
        if (!alive) return;
        setTrees([]);
      } finally {
        if (!alive) return;
        setLoadingTrees(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const startISO = startDate ? new Date(startDate).toISOString() : undefined;
        const endISO = endDate
          ? new Date(endDate + "T23:59:59").toISOString()
          : undefined;
        const tree_id = treeFilter && treeFilter !== "ทั้งหมด" ? treeFilter : undefined;
        const [data, sum] = await Promise.all([
          startISO || endISO
            ? listFruitsByDateRangeHarvestOnly({ startISO, endISO, tree_id })
            : listHarvestOnly({ tree_id }),
          getHarvestStockSummary({ tree_id }),
        ]);
        if (!alive) return;
        setRows(data);
        setSummary(normalizeSummary(sum));
        setErr("");
      } catch (e) {
        if (!alive) return;
        setErr(e?.message || "โหลดข้อมูลไม่สำเร็จ");
        setSummary(createEmptySummary());
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [startDate, endDate, treeFilter]);

  const fmtDT = (iso) => {
    if (!iso) return "-";
    const dt = new Date(iso);
    if (Number.isNaN(dt.getTime())) return "-";
    return dt.toLocaleString("th-TH", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // กรองข้อมูล
  const filtered = useMemo(() => {
    let list = rows;
    if (gradeFilter !== "ทั้งหมด")
      list = list.filter((x) => x.grade === gradeFilter);

    if (treeFilter !== "ทั้งหมด")
      list = list.filter((x) => x.tree_id === treeFilter);

    const k = q.trim().toLowerCase();
    if (!k) return list;
    return list.filter((x) =>
      `${x.id} ${x.tree_id ?? ""} ${x.grade} ${x.weight_kg} ${x.note ?? ""} ${
        x.broker_id ?? ""
      }`
        .toLowerCase()
        .includes(k)
    );
  }, [rows, gradeFilter, treeFilter, q]);

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
          title="สรุปผลผลิตทุเรียน"
          subtitle="รวมข้อมูลผลผลิตจากผู้รับเหมาทั้งหมด (ภาพรวม)"
        />

        <main className="p-4 sm:p-6 pt-28">
          <div className="max-w-6xl mx-auto space-y-4">
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
                    className="w-full border rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
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
                    className="w-full border rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-1">
                    ต้นทุเรียน
                  </label>
                  <select
                    value={treeFilter}
                    onChange={(e) => setTreeFilter(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                    disabled={loadingTrees}
                  >
                    <option value="ทั้งหมด">ทั้งหมด</option>
                    {trees.map((t) => (
                      <option key={t.tree_id} value={t.tree_id}>
                        {t.tree_id}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-1">
                    เกรด
                  </label>
                  <select
                    value={gradeFilter}
                    onChange={(e) => setGradeFilter(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
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
                  <label className="block text-sm text-slate-600 mb-1">
                    ค้นหา
                  </label>
                  <input
                    type="text"
                    placeholder="ค้นหาด้วย broker_id / เกรด / หมายเหตุ ฯลฯ"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>
            </Card>

            {/* สรุปยอดรวม */}
            <Card>
              <PageHeader
                title="สรุปรวม"
                subtitle="น้ำหนักรวม (กก.) ตามเกรด"
              />
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                <SummaryBox
                  label="น้ำหนักรวมทั้งหมด"
                  value={summary.sum_weight.toLocaleString("th-TH")}
                  subtitle="กิโลกรัม"
                />
                {GRADES.map((g) => (
                  <SummaryBox
                    key={g}
                    label={g === "ตกเกรด" ? "ตกเกรด (กก.)" : `เกรด ${g} (กก.)`}
                    value={(summary.by_grade[g] ?? 0).toLocaleString("th-TH")}
                  />
                ))}
              </div>
            </Card>

            {/* ตาราง */}
            <Card>
              {loading ? (
                <div className="text-sm text-slate-500">กำลังโหลด…</div>
              ) : err ? (
                <div className="text-sm text-rose-600">{err}</div>
              ) : filtered.length === 0 ? (
                <div className="text-sm text-slate-600">ยังไม่มีข้อมูลผลผลิต</div>
              ) : (
                <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left bg-slate-50 text-slate-600">
                        <th className="py-2 px-3">เวลา</th>
                        <th className="py-2 px-3">นายหน้า</th>
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
                          className={
                            i % 2 === 0 ? "bg-white" : "bg-slate-50/60"
                          }
                        >
                          <td className="py-2 px-3">{fmtDT(r.harvest_at)}</td>
                          <td className="py-2 px-3">{r.broker_id ?? "-"}</td>
                          <td className="py-2 px-3">
                            {r.grade === "ตกเกรด"
                              ? r.grade
                              : `เกรด ${r.grade}`}
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
              <p className="text-xs text-slate-400 mt-2">
                * แสดงเฉพาะรายการเก็บเกี่ยว ไม่รวมการส่งออก
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
    <div className="rounded-xl border bg-white p-4 text-center">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
      {subtitle && <div className="text-xs text-slate-500 mt-1">{subtitle}</div>}
    </div>
  );
}
