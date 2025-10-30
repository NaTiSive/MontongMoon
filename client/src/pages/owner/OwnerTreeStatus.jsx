// src/pages/owner/OwnerTreeStatus.jsx
import React, { useEffect, useState, useMemo } from "react";
import Sidebar from "../../components/Sidebar";
import HeaderWrapper from "../../components/HeaderWrapper";
import Card from "../../components/Card";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { listTrees } from "../../api/trees";

export default function OwnerTreeStatus() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [trees, setTrees] = useState([]);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("ทั้งหมด");

  useEffect(() => {
    if (!user || user.role !== "owner") navigate("/login");
  }, [user, navigate]);

  useEffect(() => {
    try {
      setLoading(true);
      const t = listTrees() || [];
      setTrees(t);
    } catch (e) {
      setErr(e?.message || "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, []);

  // ---------- สีแต่ละสถานะ ----------
  const statusStyle = {
    "ปกติ": {
      box: "bg-emerald-100",
      text: "text-emerald-700",
      border: "border-emerald-300",
      chip: "bg-emerald-100 text-emerald-700",
    },
    "ออกดอก": {
      box: "bg-sky-100",
      text: "text-sky-700",
      border: "border-sky-300",
      chip: "bg-sky-100 text-sky-700",
    },
    "ออกผล": {
      box: "bg-amber-100",
      text: "text-amber-700",
      border: "border-amber-300",
      chip: "bg-amber-100 text-amber-700",
    },
  };

  // ---------- คำนวณสรุป ----------
  const agg = useMemo(() => {
    const counts = { ปกติ: 0, ออกดอก: 0, ออกผล: 0 };
    for (const t of trees || []) {
      const s = t.status || "ปกติ";
      if (counts[s] == null) counts[s] = 0;
      counts[s]++;
    }
    const totalTrees = (trees || []).length;
    const byStatus = Object.keys(counts).map((status) => ({
      status,
      count: counts[status],
    }));
    return { totalTrees, byStatus };
  }, [trees]);

  const buckets = useMemo(() => {
    return (agg.byStatus || []).map((s) => ({
      key: s.status,
      count: s.count,
      ...(statusStyle[s.status] || statusStyle["ปกติ"]),
    }));
  }, [agg.byStatus]);

  const norm = (t) => ({
    id: t.id || t.tree_id || "",
    name: t.name || `ต้นที่ ${(t.id || t.tree_id || "").toString()}`,
    status: t.status || "ปกติ",
  });

  const filteredTrees = useMemo(() => {
    const k = q.trim().toLowerCase();
    const list = (trees || []).map(norm);
    return list.filter((x) => {
      const hitQ = k
        ? `${x.id} ${x.name} ${x.status}`.toLowerCase().includes(k)
        : true;
      const hitStatus =
        statusFilter === "ทั้งหมด" ? true : x.status === statusFilter;
      return hitQ && hitStatus;
    });
  }, [trees, q, statusFilter]);

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
          title="สถานะต้นทุเรียน"
          subtitle="ภาพรวมจำนวนต้นตามสถานะจริง"
        />
        <main className="p-4 sm:p-6 pt-28">
          <div className="max-w-5xl mx-auto space-y-4">
            {loading ? (
              <Card>กำลังโหลดข้อมูล…</Card>
            ) : err ? (
              <Card className="text-rose-600">{err}</Card>
            ) : (
              <>
                {/* ✅ การ์ดจำนวนต้นทั้งหมด */}
                <Card>
                  <div className="text-center py-4">
                    <div className="text-slate-500 text-sm">จำนวนต้นทุเรียนทั้งหมด</div>
                    <div className="text-3xl font-bold text-emerald-700">
                      {agg.totalTrees}
                    </div>
                  </div>
                </Card>

                {/* ✅ การ์ดตามสถานะ */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {buckets.map((b) => (
                    <Card key={b.key} className={`border ${b.border}`}>
                      <div className={`${b.box} rounded-xl px-4 py-5`}>
                        <div className={`text-sm ${b.text}`}>{b.key}</div>
                        <div className="mt-1 text-2xl font-semibold">
                          {b.count}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                {/* ✅ ตารางต้นไม้ */}
                <Card>
                  <div className="flex flex-col md:flex-row gap-3 md:items-end mb-3">
                    <div className="flex-1">
                      <label className="block text-sm text-slate-600 mb-1">ค้นหา</label>
                      <input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="ค้นหา ID/ชื่อ/สถานะ"
                        className="w-full border rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                    <div className="w-full md:w-52">
                      <label className="block text-sm text-slate-600 mb-1">สถานะ</label>
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full border rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                      >
                        <option value="ทั้งหมด">ทั้งหมด</option>
                        <option value="ปกติ">ปกติ</option>
                        <option value="ออกดอก">ออกดอก</option>
                        <option value="ออกผล">ออกผล</option>
                      </select>
                    </div>
                  </div>

                  {filteredTrees.length === 0 ? (
                    <div className="text-sm text-slate-600">
                      ยังไม่มีข้อมูลต้นทุเรียน
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="text-left bg-slate-50 text-slate-600">
                            <th className="py-2 px-3">รหัสต้น</th>
                            <th className="py-2 px-3">ชื่อ</th>
                            <th className="py-2 px-3">สถานะ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredTrees.map((t, i) => {
                            const s =
                              statusStyle[t.status] || statusStyle["ปกติ"];
                            return (
                              <tr
                                key={t.id}
                                className={
                                  i % 2 === 0 ? "bg-white" : "bg-slate-50/60"
                                }
                              >
                                <td className="py-2 px-3">{t.id}</td>
                                <td className="py-2 px-3">{t.name}</td>
                                <td className="py-2 px-3">
                                  <span
                                    className={`px-2 py-0.5 rounded-lg text-xs ${s.chip}`}
                                  >
                                    {t.status}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Card>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
