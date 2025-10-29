// src/pages/broker/BrokerHarvest.jsx
import React, { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";
import Card from "../../components/Card";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import HeaderWrapper from "../../components/HeaderWrapper";
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

  // ฟอร์ม (ภาพรวมเท่านั้น + เก็บเป็นกิโลกรัม)
  const [form, setForm] = useState({
    weight: "",
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
      weight: Number(r.weight_kg || 0),
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
    if (!Number.isFinite(weight) || weight <= 0) {
      return alert("กรุณากรอกน้ำหนักมากกว่า 0");
    }

    // บันทึกแบบภาพรวม: ไม่ระบุต้น, ไม่เก็บจำนวนผล
    const rec = createHarvestFruitRecord({
      broker_id: user?.broker_id,
      tree_id: null,
      grade: form.grade,
      weight_kg: weight,
      count: null, // ❌ ไม่ใช้งาน
      note: form.note,
    });

    setHarvests((prev) => [
      {
        id: rec.id,
        weight: Number(rec.weight_kg || 0),
        grade: rec.grade === "ตกเกรด" ? "ตกเกรด" : `เกรด ${rec.grade}`,
        note: rec.note || "-",
        date: rec.harvest_at,
      },
      ...prev,
    ]);

    setForm({
      weight: "",
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
          subtitle="กรอกผลการเก็บเกี่ยวแบบภาพรวม (หน่วยกิโลกรัม)"
        />
        <main className="p-4 sm:p-6 pt-28">
          <div className="max-w-3xl mx-auto space-y-4">
            <Card>
              <form
                onSubmit={submit}
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                {/* น้ำหนักรวม (กิโลกรัม) */}
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
                      <th className="py-2 px-3">น้ำหนัก (กก.)</th>
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
                          {h.weight.toLocaleString("th-TH")} กก.
                        </td>
                        <td className="py-2 px-3">{h.grade}</td>
                        <td className="py-2 px-3">{h.note}</td>
                      </tr>
                    ))}
                    {harvests.length === 0 && (
                      <tr>
                        <td className="py-4 px-3 text-slate-500" colSpan={4}>
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
