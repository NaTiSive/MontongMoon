// src/pages/broker/BrokerHarvest.jsx
import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "../../components/Sidebar";
import HeaderWrapper from "../../components/HeaderWrapper";
import Card from "../../components/Card";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const HARV_KEY = "mm:harvest@v1"; // { [broker_id]: HarvestRow[] }

export default function BrokerHarvest() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (!user || user.role !== "broker") navigate("/login");
  }, [user, navigate]);

  const disabled = user?.approvalStatus !== "approved";

  // ───────────────────────────
  // LocalStorage helpers
  function loadMine() {
    try {
      const map = JSON.parse(localStorage.getItem(HARV_KEY) || "{}");
      return map[user?.broker_id] || [];
    } catch {
      return [];
    }
  }
  function saveMine(rows) {
    const map = JSON.parse(localStorage.getItem(HARV_KEY) || "{}");
    map[user?.broker_id] = rows;
    localStorage.setItem(HARV_KEY, JSON.stringify(map));
  }

  // ───────────────────────────
  // State
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10), // YYYY-MM-DD
    grade: "A",
    weight: "",
    note: "",
  });

  useEffect(() => {
    if (!user) return;
    setRows(loadMine());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.broker_id]);

  const update = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const add = () => {
    if (disabled) return;
    const w = Number(form.weight);
    if (!form.date) return alert("กรุณาเลือกวันที่");
    if (!Number.isFinite(w) || w <= 0) return alert("กรุณากรอกน้ำหนักให้ถูกต้อง (> 0)");
    if (!["A", "B", "C", "ตกเกรด"].includes(form.grade)) return alert("กรุณาเลือกเกรด");

    const rec = {
      id: crypto.randomUUID(),
      date: form.date,
      grade: form.grade,
      weight: w,
      note: form.note?.trim() || "",
      broker_id: user?.broker_id,
      createdAt: new Date().toISOString(),
    };
    const next = [rec, ...rows];
    setRows(next);
    saveMine(next);
    setForm({
      date: new Date().toISOString().slice(0, 10),
      grade: form.grade,
      weight: "",
      note: "",
    });
  };

  const removeRow = (id) => {
    if (!window.confirm("ลบรายการนี้หรือไม่?")) return;
    const next = rows.filter((r) => r.id !== id);
    setRows(next);
    saveMine(next);
  };

  // ───────────────────────────
  // Summary
  const sumA = useMemo(() => rows.filter((r) => r.grade === "A").reduce((s, r) => s + r.weight, 0), [rows]);
  const sumB = useMemo(() => rows.filter((r) => r.grade === "B").reduce((s, r) => s + r.weight, 0), [rows]);
  const sumC = useMemo(() => rows.filter((r) => r.grade === "C").reduce((s, r) => s + r.weight, 0), [rows]);
  const sumX = useMemo(() => rows.filter((r) => r.grade === "ตกเกรด").reduce((s, r) => s + r.weight, 0), [rows]);
  const total = sumA + sumB + sumC + sumX;

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
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <HeaderWrapper
          onMenuClick={() => setIsSidebarOpen(true)}
          title="บันทึกการเก็บเกี่ยว (ฝั่งนายหน้า)"
          subtitle="เพิ่มบันทึกน้ำหนักที่เก็บได้แยกตามเกรด — ใช้งานเต็มได้เมื่อบัญชีอนุมัติแล้ว"
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

            {/* สรุปผลรวม */}
            <Card>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Summary label="รวมทั้งหมด" value={`${total.toLocaleString("th-TH")} กก.`} />
                <Summary label="เกรด A" value={`${sumA.toLocaleString("th-TH")} กก.`} />
                <Summary label="เกรด B" value={`${sumB.toLocaleString("th-TH")} กก.`} />
                <Summary label="เกรด C" value={`${sumC.toLocaleString("th-TH")} กก.`} />
                <Summary label="ตกเกรด" value={`${sumX.toLocaleString("th-TH")} กก.`} />
              </div>
            </Card>

            {/* ฟอร์มเพิ่มรายการ */}
            <Card>
              <h3 className="font-semibold mb-2">เพิ่มบันทึกการเก็บเกี่ยว</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-sm text-slate-600 mb-1">วันที่</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={update("date")}
                    disabled={disabled}
                    className="w-full border rounded-lg px-3 py-2 bg-white disabled:bg-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-1">เกรด</label>
                  <select
                    value={form.grade}
                    onChange={update("grade")}
                    disabled={disabled}
                    className="w-full border rounded-lg px-3 py-2 bg-white disabled:bg-slate-100"
                  >
                    <option>A</option>
                    <option>B</option>
                    <option>C</option>
                    <option>ตกเกรด</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-1">น้ำหนัก (กก.)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={form.weight}
                    onChange={update("weight")}
                    disabled={disabled}
                    className="w-full border rounded-lg px-3 py-2 bg-white disabled:bg-slate-100"
                    placeholder="เช่น 120.5"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-1">หมายเหตุ</label>
                  <input
                    value={form.note}
                    onChange={update("note")}
                    disabled={disabled}
                    className="w-full border rounded-lg px-3 py-2 bg-white disabled:bg-slate-100"
                    placeholder="ตัวอย่าง: แปลง B แถว 3"
                  />
                </div>
              </div>
              <button
                onClick={add}
                disabled={disabled}
                className={`mt-3 px-4 py-2 rounded-lg text-white text-sm ${
                  disabled ? "bg-slate-400 cursor-not-allowed" : "bg-emerald-700 hover:bg-emerald-800"
                }`}
              >
                เพิ่มรายการ
              </button>
            </Card>

            {/* ตารางรายการ */}
            <Card>
              <h3 className="font-semibold mb-2">รายการของฉัน</h3>
              {rows.length === 0 ? (
                <div className="text-sm text-slate-600">ยังไม่มีรายการ</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left border-b">
                        <th className="py-2 pr-4">วันที่</th>
                        <th className="py-2 pr-4">เกรด</th>
                        <th className="py-2 pr-4">น้ำหนัก (กก.)</th>
                        <th className="py-2 pr-4">หมายเหตุ</th>
                        <th className="py-2 pr-4">บันทึกเมื่อ</th>
                        <th className="py-2 pr-4"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.id} className="border-b">
                          <td className="py-2 pr-4">{r.date}</td>
                          <td className="py-2 pr-4">{r.grade}</td>
                          <td className="py-2 pr-4">{r.weight.toLocaleString("th-TH")}</td>
                          <td className="py-2 pr-4">{r.note || "-"}</td>
                          <td className="py-2 pr-4">{fmtDT(r.createdAt)}</td>
                          <td className="py-2 pr-4">
                            <button
                              onClick={() => removeRow(r.id)}
                              className="px-2 py-1 rounded-md text-white bg-rose-600 hover:bg-rose-700"
                            >
                              ลบ
                            </button>
                          </td>
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

function Summary({ label, value }) {
  return (
    <div>
      <div className="text-slate-500 text-sm">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}
