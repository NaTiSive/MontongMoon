// src/pages/broker/BrokerReportProblem.jsx
import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "../../components/Sidebar";
import HeaderWrapper from "../../components/HeaderWrapper";
import Card from "../../components/Card";
import InputField from "../../components/InputField";
import TextArea from "../../components/TextArea";
import SelectField from "../../components/SelectField";
import PrimaryButton from "../../components/PrimaryButton";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

import { seedTreesIfEmpty, listTrees } from "../../api/trees";
import { createProblem, listProblems, brokerConfirmFixed } from "../../api/problems";

export default function BrokerReportProblem() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (!user || user.role !== "broker") navigate("/login");
  }, [user, navigate]);

  // ----- ฟอร์มรายงานใหม่ -----
  const [mode, setMode] = useState("รายต้น"); // "รายต้น" | "ทั้งสวน"
  const [treeId, setTreeId] = useState("");
  const [note, setNote] = useState("");
  const [trees, setTrees] = useState([]);

  // ----- รายการปัญหาของฉัน -----
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await seedTreesIfEmpty();
        const t = await listTrees();
        if (!alive) return;
        setTrees(t || []);

        const all = await listProblems();
        if (!alive) return;
        // รองรับทั้ง broker_id และ brokerId
        const mine = (all || []).filter(
          (p) => String(p.broker_id ?? p.brokerId ?? "") === String(user?.broker_id ?? "")
        );
        setRows(mine);
      } catch {
        if (!alive) return;
        setRows([]);
      }
    })();
    return () => { alive = false; };
  }, [user?.broker_id]);

  const parseType = (desc = "") => {
    if (desc.startsWith("[รายต้น]")) return "รายต้น";
    if (desc.startsWith("[ทั้งสวน]")) return "ทั้งสวน";
    return "-";
  };

  // ✅ ครอบคลุมชื่อสถานะหลากหลายรูปแบบ (ไทย/อังกฤษ)
  const isPendingStatus = (s) => {
    const k = String(s || "")
      .toLowerCase()
      .replace(/\s/g, ""); // ตัดช่องว่างออก เผื่อมีเว้นวรรค
    return (
      k.includes("ระหว่างแก้ไข") ||
      k.includes("รอการแก้ไข") ||
      k.includes("รอดำเนินการ") ||
      k === "pending" ||
      k === "inprogress" ||
      k === "progress"
    );
  };

  const filtered = useMemo(() => {
    const k = q.trim().toLowerCase();
    return rows.filter((r) => {
      const text = `${r.description || ""} ${r.owner_note || ""} ${r.status || ""}`.toLowerCase();
      const hitQ = k ? text.includes(k) : true;
      const hitType = typeFilter ? parseType(r.description) === typeFilter : true;
      return hitQ && hitType;
    });
  }, [rows, q, typeFilter]);

  const fmtDT = (iso) =>
    iso
      ? new Date(iso).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })
      : "-";

  // ----- ส่งรายงานใหม่ -----
  const submit = async () => {
    if (!note.trim()) return alert("กรุณากรอกรายละเอียดปัญหา");
    if (mode === "รายต้น" && !treeId) return alert("กรุณาเลือกต้นทุเรียน");

    await createProblem({
      scope: mode,
      tree_id: mode === "รายต้น" ? treeId || null : null,
      description: note.trim(),
    });

    const all = await listProblems();
    const mine = (all || []).filter(
      (p) => String(p.broker_id ?? p.brokerId ?? "") === String(user?.broker_id ?? "")
    );
    setRows(mine);

    setNote("");
    if (mode === "รายต้น") setTreeId("");
  };

  // ----- นายหน้ายืนยัน “แก้ไขแล้ว” -----
  const confirmFixed = async (id) => {
    await brokerConfirmFixed(id);
    const all = await listProblems();
    const mine = (all || []).filter(
      (p) => String(p.broker_id ?? p.brokerId ?? "") === String(user?.broker_id ?? "")
    );
    setRows(mine);
  };

  const badge = (status) => {
    const cls =
      String(status) === "เปิดปัญหา"
        ? "bg-rose-100 text-rose-700"
        : isPendingStatus(status)
        ? "bg-amber-100 text-amber-700"
        : "bg-emerald-100 text-emerald-700";
    return <span className={`px-3 py-1 rounded-lg text-xs font-medium ${cls}`}>{status}</span>;
  };

  return (
    <div className={`min-h-screen w-full bg-slate-50 text-slate-900 flex flex-col md:flex-row ${isSidebarOpen ? "overflow-hidden md:overflow-auto" : ""}`}>
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <HeaderWrapper
          onMenuClick={() => setIsSidebarOpen(true)}
          title="รายงานปัญหา"
          subtitle="สร้างปัญหาใหม่และติดตามสถานะ (ยืนยันแก้ไขได้ที่นี่)"
        />

        <main className="p-4 sm:p-6 pt-28">
          <div className="max-w-5xl mx-auto space-y-4">
            {/* ฟอร์ม */}
            <Card>
              <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                <div className="md:col-span-2">
                  <SelectField
                    label="ลักษณะรายการ"
                    placeholder="เลือก"
                    options={["รายต้น", "ทั้งสวน"]}
                    value={mode}
                    onChange={(e) => setMode(e.target.value)}
                  />
                </div>

                {mode === "รายต้น" && (
                  <div className="md:col-span-2">
                    <label className="block text-sm text-slate-600 mb-1">ต้นทุเรียน</label>
                    <select
                      value={treeId}
                      onChange={(e) => setTreeId(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                    >
                      <option value="">— เลือกต้น —</option>
                      {trees.map((t) => (
                        <option key={t.id || t.tree_id} value={t.id || t.tree_id}>
                          {(t.id || t.tree_id) + (t.name ? ` — ${t.name}` : "")}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className={mode === "รายต้น" ? "md:col-span-6" : "md:col-span-4"}>
                  <TextArea
                    label="รายละเอียดปัญหา"
                    placeholder="อธิบายสิ่งที่พบ"
                    rows={3}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </div>

                <div className="md:col-span-6 flex justify-end">
                  <PrimaryButton
                    title="ส่งปัญหา"
                    onClick={submit}
                    disabled={!note.trim() || (mode === "รายต้น" && !treeId)}
                  />
                </div>
              </div>
            </Card>

            {/* ตัวกรอง */}
            <Card>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <InputField
                  label="ค้นหา"
                  placeholder="ค้นหาจากข้อความ/สถานะ/โน้ตเจ้าของ"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
                <div>
                  <label className="block text-sm text-slate-600 mb-1">ประเภท</label>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    <option value="">ทั้งหมด</option>
                    <option value="รายต้น">รายต้น</option>
                    <option value="ทั้งสวน">ทั้งสวน</option>
                  </select>
                </div>
              </div>
            </Card>

            {/* ตาราง + ปุ่มยืนยันแก้ไข */}
            <Card>
              {filtered.length === 0 ? (
                <div className="text-sm text-slate-600">ยังไม่มีรายการปัญหา</div>
              ) : (
                <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left bg-slate-50 text-slate-600">
                        <th className="py-2 px-3">#</th>
                        <th className="py-2 px-3">ประเภท</th>
                        <th className="py-2 px-3">ต้นทุเรียน</th>
                        <th className="py-2 px-3">รายละเอียด</th>
                        <th className="py-2 px-3">สถานะ</th>
                        <th className="py-2 px-3">แนวทางแก้ (Owner)</th>
                        <th className="py-2 px-3">อัปเดตล่าสุด</th>
                        <th className="py-2 px-3">การกระทำ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((r, i) => (
                        <tr key={r.id} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
                          <td className="py-2 px-3">{r.id.slice(0, 8)}</td>
                          <td className="py-2 px-3">{parseType(r.description)}</td>
                          <td className="py-2 px-3">{r.tree_id || "-"}</td>
                          <td className="py-2 px-3">
                            {String(r.description || "").replace(/^\[(รายต้น|ทั้งสวน)\]\s*/u, "")}
                          </td>
                          <td className="py-2 px-3">{badge(r.status)}</td>
                          <td className="py-2 px-3">{r.owner_note || "-"}</td>
                          <td className="py-2 px-3">{fmtDT(r.updated_at || r.created_at)}</td>
                          <td className="py-2 px-3">
                            {isPendingStatus(r.status) ? (
                              <button
                                onClick={() => confirmFixed(r.id)}
                                className="px-3 py-1 rounded-lg text-white text-xs bg-emerald-700 hover:bg-emerald-800"
                              >
                                ✅ ยืนยันแก้ไขแล้ว
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
              )}
              <p className="text-xs text-slate-400 mt-2">
                * สถานะเริ่มต้น: “เปิดปัญหา” → เจ้าของมอบหมายเป็น “รอการแก้ไข/ระหว่างแก้ไข” → นายหน้ายืนยันเป็น “แก้ไขแล้ว”
              </p>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
