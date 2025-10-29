// src/pages/broker/BrokerHarvest.jsx
import React, { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";
import Card from "../../components/Card";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import HeaderWrapper from "../../components/HeaderWrapper";
import { listTrees } from "../../api/trees";
import {
  GRADES,
  listFruitsByBroker,
  createHarvestFruitRecord,
} from "../../api/fruits";

export default function BrokerHarvest() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (!user || user.role !== "broker") navigate("/login");
  }, [user, navigate]);

  const disabled = user?.approvalStatus !== "approved";

  // โหลดรายการต้นทุเรียน
  const [trees, setTrees] = useState([]);
  useEffect(() => {
    const all = listTrees();
    setTrees(all);
  }, []);

  // ฟอร์ม: เพิ่ม recordMode (ภาพรวม/รายต้น) + tree_id (เมื่อรายต้น)
  const [form, setForm] = useState({
    recordMode: "ภาพรวม", // "ภาพรวม" | "รายต้น"
    tree_id: "",
    weight: "",
    count: "",
    grade: GRADES[0],
    note: "",
  });
  const handleChange = (k) => (e) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  // ตารางรายการที่บันทึก
  const [harvests, setHarvests] = useState([]);

  useEffect(() => {
    if (!user?.broker_id) return;
    const mine = listFruitsByBroker(user.broker_id) || [];
    const mapped = mine.map((r) => ({
      id: r.id,
      tree_id: r.tree_id ?? null,
      weight: Number(r.weight_kg || 0),
      count: r.count || 1,
      grade: r.grade === "ตกเกรด" ? "ตกเกรด" : `เกรด ${r.grade}`,
      note: r.note || "-",
      date: r.harvest_at,
    }));
    mapped.sort((a, b) => new Date(b.date) - new Date(a.date));
    setHarvests(mapped);
  }, [user?.broker_id]);

  const fmtDate = (iso) =>
    new Date(iso).toLocaleString("th-TH", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const submit = (e) => {
    e.preventDefault();
    if (disabled) return;

    const weight = parseFloat(form.weight);
    const count = parseInt(form.count);

    // ตรวจสอบตามโหมด
    if (form.recordMode === "รายต้น" && !form.tree_id) {
      return alert("กรุณาเลือกต้นทุเรียน (โหมดรายต้น)");
    }
    if (!Number.isFinite(weight) || weight <= 0) {
      return alert("กรุณากรอกน้ำหนักมากกว่า 0");
    }
    if (!Number.isFinite(count) || count <= 0) {
      return alert("กรุณากรอกจำนวนผลมากกว่า 0");
    }

    // ถ้าเป็นภาพรวม → ส่ง tree_id เป็น null
    const rec = createHarvestFruitRecord({
      broker_id: user?.broker_id,
      tree_id: form.recordMode === "รายต้น" ? form.tree_id : null,
      grade: form.grade,
      weight_kg: weight,
      count: count,
      note: form.note,
    });

    setHarvests((prev) => [
      {
        id: rec.id,
        tree_id: rec.tree_id ?? null,
        weight: Number(rec.weight_kg || 0),
        count: rec.count || 1,
        grade: rec.grade === "ตกเกรด" ? "ตกเกรด" : `เกรด ${rec.grade}`,
        note: rec.note || "-",
        date: rec.harvest_at,
      },
      ...prev,
    ]);

    setForm({
      recordMode: form.recordMode, // คงโหมดที่ผู้ใช้เลือกไว้
      tree_id: "",
      weight: "",
      count: "",
      grade: GRADES[0],
      note: "",
    });
    alert("บันทึกผลผลิตเรียบร้อย");
  };

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
          title="บันทึกผลผลิต"
          subtitle="กรอกผลการเก็บเกี่ยวตามความจริง"
        />
        <main className="p-4 sm:p-6 pt-28">
          <div className="max-w-3xl mx-auto space-y-4">
            <Card>
              <form
                onSubmit={submit}
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                {/* ลักษณะการบันทึก */}
                <div>
                  <label className="block text-sm text-slate-600 mb-1">
                    ลักษณะการบันทึก
                  </label>
                  <select
                    value={form.recordMode}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        recordMode: e.target.value,
                        // ถ้าสลับเป็นภาพรวม ให้ล้าง tree_id
                        tree_id:
                          e.target.value === "ภาพรวม" ? "" : p.tree_id,
                      }))
                    }
                    disabled={disabled}
                    className="w-full border rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    <option value="ภาพรวม">ภาพรวม (ไม่ระบุต้น)</option>
                    <option value="รายต้น">รายต้น (ต้องเลือกต้นทุเรียน)</option>
                  </select>
                </div>

                {/* เลือกต้นทุเรียน (เฉพาะโหมดรายต้น) */}
                {form.recordMode === "รายต้น" && (
                  <div>
                    <label className="block text-sm text-slate-600 mb-1">
                      ต้นทุเรียน
                    </label>
                    <select
                      value={form.tree_id}
                      onChange={handleChange("tree_id")}
                      disabled={disabled}
                      className="w-full border rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                    >
                      <option value="">-- เลือกต้นทุเรียน --</option>
                      {trees.map((t) => (
                        <option key={t.tree_id} value={t.tree_id}>
                          ต้นที่ {t.tree_id} ({t.status})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* น้ำหนักรวม */}
                <div>
                  <label className="block text-sm text-slate-600 mb-1">
                    น้ำหนักรวม (กิโลกรัม)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={form.weight}
                    onChange={handleChange("weight")}
                    placeholder="เช่น 850"
                    className="w-full border rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                    disabled={disabled}
                  />
                </div>

                {/* จำนวนผล */}
                <div>
                  <label className="block text-sm text-slate-600 mb-1">
                    จำนวนผล
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={form.count}
                    onChange={handleChange("count")}
                    placeholder="เช่น 12"
                    className="w-full border rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                    disabled={disabled}
                  />
                </div>

                {/* เกรดคุณภาพ */}
                <div>
                  <label className="block text-sm text-slate-600 mb-1">
                    คุณภาพทุเรียน
                  </label>
                  <select
                    value={form.grade}
                    onChange={handleChange("grade")}
                    className="w-full border rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                    disabled={disabled}
                  >
                    {GRADES.map((g) => (
                      <option key={g} value={g}>
                        {g === "ตกเกรด" ? "ตกเกรด" : `เกรด ${g}`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* หมายเหตุ */}
                <div className="md:col-span-2">
                  <label className="block text-sm text-slate-600 mb-1">
                    หมายเหตุ
                  </label>
                  <textarea
                    value={form.note}
                    onChange={handleChange("note")}
                    placeholder="เช่น ทุเรียนขนาดเล็ก / เปลือกหนา / มีรอยช้ำ"
                    rows={2}
                    className="w-full border rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                    disabled={disabled}
                  />
                </div>

                {/* ปุ่ม */}
                <div className="md:col-span-2">
                  <button
                    type="submit"
                    disabled={disabled}
                    className={`px-4 py-2 rounded-lg text-sm ${
                      disabled
                        ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                        : "bg-emerald-700 text-white hover:bg-emerald-800"
                    }`}
                  >
                    บันทึกผลผลิต
                  </button>
                  {disabled && (
                    <p className="text-xs text-slate-500 mt-2">
                      * บัญชีของคุณยังไม่ได้รับการอนุมัติ — ยังไม่สามารถบันทึกผลผลิตได้
                    </p>
                  )}
                </div>
              </form>
            </Card>

            <Card>
              <h3 className="font-semibold text-slate-800 mb-2">
                ผลผลิตที่บันทึกล่าสุด
              </h3>
              <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left bg-slate-50 text-slate-600">
                      <th className="py-2 px-3">วันที่</th>
                      <th className="py-2 px-3">ต้นทุเรียน</th>
                      <th className="py-2 px-3">น้ำหนัก</th>
                      <th className="py-2 px-3">จำนวนผล</th>
                      <th className="py-2 px-3">คุณภาพ</th>
                      <th className="py-2 px-3">หมายเหตุ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {harvests.map((h, i) => (
                      <tr
                        key={h.id}
                        className={i % 2 === 0 ? "bg-white" : "bg-slate-50/60"}
                      >
                        <td className="py-2 px-3">{fmtDate(h.date)}</td>
                        <td className="py-2 px-3">
                          {h.tree_id ? `ต้นที่ ${h.tree_id}` : "ภาพรวม"}
                        </td>
                        <td className="py-2 px-3">
                          {h.weight.toLocaleString("th-TH")} กก.
                        </td>
                        <td className="py-2 px-3">{h.count}</td>
                        <td className="py-2 px-3">{h.grade}</td>
                        <td className="py-2 px-3">{h.note}</td>
                      </tr>
                    ))}
                    {harvests.length === 0 && (
                      <tr>
                        <td className="py-4 px-3 text-slate-500" colSpan={6}>
                          ยังไม่มีการบันทึกผลผลิต
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
