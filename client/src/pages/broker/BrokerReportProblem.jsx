// src/pages/broker/BrokerReportProblem.jsx
import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "../../components/Sidebar";
import HeaderWrapper from "../../components/HeaderWrapper";
import Card from "../../components/Card";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

import {
  listProblems,
  createProblem,
  brokerConfirmFixed,
} from "../../api/problems";
import {
  listTrees,
  seedTreesIfEmpty,
} from "../../api/trees";

export default function BrokerReportProblem() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (!user || user.role !== "broker") navigate("/login");
  }, [user, navigate]);

  // ❗ตามกติกา: broker ที่ยังไม่ approved ยัง "ไม่ควร" ใช้ฟีเจอร์นี้
  const disabled = user?.approvalStatus !== "approved";

  // ---- load trees + my problems ----
  const [trees, setTrees] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        seedTreesIfEmpty();
        const t = listTrees();
        const all = listProblems();
        if (!alive) return;
        setTrees(t);
        setRows(all.filter((p) => p.broker_id === user?.broker_id));
      } catch (e) {
        if (!alive) return;
        setErr(e?.message || "โหลดข้อมูลไม่สำเร็จ");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [user?.broker_id]);

  // ---- form ----
  const [form, setForm] = useState({
    tree_id: "",
    description: "",
  });
  const update = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const submit = () => {
    if (disabled) return;
    if (!form.tree_id) return alert("กรุณาเลือกต้นที่มีปัญหา");
    if (!form.description.trim()) return alert("กรุณากรอกรายละเอียดปัญหา");
    const rec = createProblem({
      broker_id: user?.broker_id,
      tree_id: form.tree_id,
      description: form.description.trim(),
    });
    setRows((r) => [rec, ...r]);
    setForm({ tree_id: "", description: "" });
    alert("ส่งรายงานปัญหาเรียบร้อย");
  };

  const confirmFixed = (id) => {
    if (!window.confirm("ยืนยันว่าแก้ไขปัญหานี้เสร็จแล้ว?")) return;
    const rec = brokerConfirmFixed(id);
    setRows((r) => r.map((x) => (x.id === id ? rec : x)));
  };

  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const k = q.trim().toLowerCase();
    if (!k) return rows;
    return rows.filter((p) =>
      `${p.id} ${p.tree_id} ${p.description} ${p.owner_note} ${p.status}`
        .toLowerCase()
        .includes(k)
    );
  }, [rows, q]);

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
          title="รายงานปัญหาหน้างาน"
          subtitle="แจ้งปัญหาที่พบในสวน—ยืนยันปิดงานเมื่อแก้ไขเรียบร้อย"
        />

        <main className="p-4 sm:p-6 pt-28">
          <div className="max-w-5xl mx-auto space-y-4">
            {user?.approvalStatus !== "approved" && (
              <Card>
                <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  บัญชีของคุณยัง <b>รออนุมัติ</b> — ฟอร์มนี้ถูกปิดการใช้งานชั่วคราว
                </div>
              </Card>
            )}

            <Card>
              <h3 className="font-semibold mb-2">สร้างรายงานปัญหา</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm text-slate-600 mb-1">ต้นที่พบปัญหา</label>
                  <select
                    value={form.tree_id}
                    onChange={update("tree_id")}
                    disabled={disabled}
                    className="w-full border rounded-lg px-3 py-2 bg-white disabled:bg-slate-100"
                  >
                    <option value="">— เลือกต้น —</option>
                    {trees.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.id} — {t.name} ({t.status})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm text-slate-600 mb-1">รายละเอียดปัญหา</label>
                  <input
                    value={form.description}
                    onChange={update("description")}
                    disabled={disabled}
                    className="w-full border rounded-lg px-3 py-2 bg-white disabled:bg-slate-100"
                    placeholder="เช่น ใบร่วงผิดปกติ / กิ่งหัก / มีรอยเชื้อรา"
                  />
                </div>
              </div>
              <button
                onClick={submit}
                disabled={disabled}
                className={`mt-3 px-4 py-2 rounded-lg text-white text-sm ${
                  disabled ? "bg-slate-400 cursor-not-allowed" : "bg-emerald-700 hover:bg-emerald-800"
                }`}
              >
                ส่งรายงาน
              </button>
            </Card>

            <Card>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">รายการปัญหาของฉัน</h3>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="ค้นหา #ไอดี / ต้นไม้ / สถานะ / โน้ต"
                  className="w-64 border rounded-lg px-3 py-2 bg-white"
                />
              </div>

              {loading ? (
                <div className="text-sm text-slate-500">กำลังโหลด…</div>
              ) : err ? (
                <div className="text-sm text-rose-600">{err}</div>
              ) : filtered.length === 0 ? (
                <div className="text-sm text-slate-600">ยังไม่มีรายการ</div>
              ) : (
                <div className="space-y-3">
                  {filtered.map((p) => (
                    <div key={p.id} className="rounded-xl bg-white shadow-sm p-4 border">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold text-lg">#{p.id.slice(0, 8)} • ต้น {p.tree_id}</div>
                          <div className="text-sm text-slate-600">
                            สร้างเมื่อ {fmtDT(p.created_at)} {p.updated_at ? `• อัปเดตล่าสุด ${fmtDT(p.updated_at)}` : ""}
                          </div>
                        </div>
                        {badge(p.status)}
                      </div>

                      <div className="mt-2 text-sm">
                        <div className="text-slate-500">รายละเอียด</div>
                        <div className="font-medium">{p.description}</div>
                      </div>

                      {p.owner_note && (
                        <div className="mt-2 text-sm">
                          <div className="text-slate-500">โน้ตจากเจ้าของสวน</div>
                          <div className="font-medium">{p.owner_note}</div>
                        </div>
                      )}

                      {p.status === "ระหว่างแก้ไข" && (
                        <div className="mt-3">
                          <button
                            onClick={() => confirmFixed(p.id)}
                            className="px-3 py-2 rounded-lg text-white bg-emerald-700 hover:bg-emerald-800 text-sm"
                          >
                            ✅ ยืนยันแก้ไขแล้ว
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
