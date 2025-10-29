// src/pages/broker/BrokerActivity.jsx
import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "../../components/Sidebar";
import HeaderWrapper from "../../components/HeaderWrapper";
import Card from "../../components/Card";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

import {
  createActivity,
  listActivitiesByBroker,
} from "../../api/activities";
import {
  listTrees,
  seedTreesIfEmpty,
  updateTreeStatus,
} from "../../api/trees";

export default function BrokerActivity() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (!user || user.role !== "broker") navigate("/login");
  }, [user, navigate]);

  const disabled = user?.approvalStatus !== "approved";

  // ───────────────────────────
  // Load trees + my activities
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
        const acts = listActivitiesByBroker(user?.broker_id);
        if (!alive) return;
        setTrees(t);
        // sort ใหม่สุดก่อน
        setRows(
          acts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        );
      } catch (e) {
        if (!alive) return;
        setErr(e?.message || "โหลดข้อมูลไม่สำเร็จ");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [user?.broker_id]);

  // ───────────────────────────
  // Form state
  const [form, setForm] = useState({
    tree_id: "",
    type: "รดน้ำ",
    note: "",
    updateTree: false,
    newStatus: "ปกติ", // ปกติ | ออกดอก | ออกผล
  });

  const update = (k) => (e) =>
    setForm((p) => ({
      ...p,
      [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value,
    }));

  const add = () => {
    if (disabled) return;
    if (!form.tree_id) return alert("กรุณาเลือกต้นไม้");
    if (!form.type) return alert("กรุณาเลือกประเภทกิจกรรม");

    // create activity
    const rec = createActivity({
      broker_id: user?.broker_id,
      tree_id: form.tree_id,
      type: form.type,
      note: form.note?.trim() || "",
    });
    // optional: update tree status
    if (form.updateTree) {
      try {
        updateTreeStatus(form.tree_id, form.newStatus);
        // รีโหลด trees เพื่อสะท้อนสถานะใหม่
        setTrees(listTrees());
      } catch (e) {
        console.error(e);
        alert(e?.message || "อัปเดตสถานะต้นไม้ไม่สำเร็จ");
      }
    }
    setRows((r) => [rec, ...r]);
    setForm({
      tree_id: "",
      type: form.type,
      note: "",
      updateTree: false,
      newStatus: "ปกติ",
    });
  };

  // ───────────────────────────
  // Filters + search
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState("ทั้งหมด");
  const filtered = useMemo(() => {
    let list = rows;
    if (typeFilter !== "ทั้งหมด") {
      list = list.filter((x) => x.type === typeFilter);
    }
    const k = q.trim().toLowerCase();
    if (!k) return list;
    return list.filter((x) =>
      `${x.id} ${x.tree_id} ${x.type} ${x.note}`.toLowerCase().includes(k)
    );
  }, [rows, q, typeFilter]);

  const fmtDT = (iso) =>
    new Date(iso).toLocaleString("th-TH", {
      dateStyle: "medium",
      timeStyle: "short",
    });

  const typeOptions = [
    "รดน้ำ",
    "ใส่ปุ๋ย",
    "ตัดหญ้า",
    "ฉีดพ่น",
    "ตรวจสุขภาพ",
    "อื่นๆ",
  ];

  const statusOptions = ["ปกติ", "ออกดอก", "ออกผล"];

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
          title="บันทึกกิจกรรม (ฝั่งนายหน้า)"
          subtitle="เลือกต้นไม้และกิจกรรมที่ทำ — อัปเดตสถานะต้นไม้ได้ถ้าจำเป็น"
        />

        <main className="p-4 sm:p-6 pt-28">
          <div className="max-w-5xl mx-auto space-y-4">
            {disabled && (
              <Card>
                <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  บัญชีของคุณยัง <b>รออนุมัติ</b> — ฟอร์มนี้ถูกปิดการใช้งานชั่วคราว
                </div>
              </Card>
            )}

            {/* ฟอร์มเพิ่มกิจกรรม */}
            <Card>
              <h3 className="font-semibold mb-2">เพิ่มกิจกรรมใหม่</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-sm text-slate-600 mb-1">
                    เลือกต้นไม้
                  </label>
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

                <div>
                  <label className="block text-sm text-slate-600 mb-1">
                    ประเภทกิจกรรม
                  </label>
                  <select
                    value={form.type}
                    onChange={update("type")}
                    disabled={disabled}
                    className="w-full border rounded-lg px-3 py-2 bg-white disabled:bg-slate-100"
                  >
                    {typeOptions.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm text-slate-600 mb-1">
                    หมายเหตุ
                  </label>
                  <input
                    value={form.note}
                    onChange={update("note")}
                    disabled={disabled}
                    className="w-full border rounded-lg px-3 py-2 bg-white disabled:bg-slate-100"
                    placeholder="ตัวอย่าง: แปลง A แถว 2 / ใช้ปุ๋ยสูตร 15-15-15"
                  />
                </div>
              </div>

              {/* อัปเดตสถานะต้น (ออปชัน) */}
              <div className="mt-3 space-y-2">
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.updateTree}
                    onChange={update("updateTree")}
                    disabled={disabled}
                  />
                  <span>อัปเดตสถานะต้นไม้ (ออปชัน)</span>
                </label>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm text-slate-600 mb-1">
                      สถานะใหม่
                    </label>
                    <select
                      value={form.newStatus}
                      onChange={update("newStatus")}
                      disabled={disabled || !form.updateTree}
                      className="w-full border rounded-lg px-3 py-2 bg-white disabled:bg-slate-100"
                    >
                      {statusOptions.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <button
                onClick={add}
                disabled={disabled}
                className={`mt-3 px-4 py-2 rounded-lg text-white text-sm ${
                  disabled
                    ? "bg-slate-400 cursor-not-allowed"
                    : "bg-emerald-700 hover:bg-emerald-800"
                }`}
              >
                เพิ่มกิจกรรม
              </button>
            </Card>

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
                    <option>ทั้งหมด</option>
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

            {/* ตารางรายการกิจกรรม */}
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
                        <th className="py-2 pr-4">ต้นไม้</th>
                        <th className="py-2 pr-4">กิจกรรม</th>
                        <th className="py-2 pr-4">หมายเหตุ</th>
                        <th className="py-2 pr-4">#ไอดี</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((r) => (
                        <tr key={r.id} className="border-b">
                          <td className="py-2 pr-4">{fmtDT(r.created_at)}</td>
                          <td className="py-2 pr-4">{r.tree_id}</td>
                          <td className="py-2 pr-4">{r.type}</td>
                          <td className="py-2 pr-4">{r.note || "-"}</td>
                          <td className="py-2 pr-4">{r.id.slice(0, 8)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="text-xs text-slate-400 mt-2">
                * ข้อมูลนี้เป็น mock ฝั่งนายหน้า (เก็บในเบราว์เซอร์) — เมื่อเชื่อม backend แล้วให้ย้ายไปเรียก API จริง
              </p>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
