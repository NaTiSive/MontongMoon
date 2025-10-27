// src/pages/broker/BrokerHarvest.jsx
import React, { useState } from "react";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import Card from "../../components/Card";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import HeaderWrapper from "../../components/HeaderWrapper";

export default function BrokerHarvest() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || user.role !== "broker") {
      navigate("/login");
    }
  }, [user, navigate]);
  const [form, setForm] = useState({
    weight: "",
    grade: "เกรด A",
  });

  const [harvests, setHarvests] = useState([
    { id: 1, weight: 850, grade: "เกรด A", date: "2025-10-04T07:00:00" },
    { id: 2, weight: 850, grade: "เกรด B", date: "2025-10-03T11:30:00" },
  ]);

  const handleChange = (key) => (e) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

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
    const weight = parseFloat(form.weight);
    if (!weight || weight <= 0) {
      alert("กรุณากรอกจำนวนผลผลิตเป็นตัวเลขมากกว่า 0");
      return;
    }

    const record = {
      id: harvests.length + 1,
      weight,
      grade: form.grade,
      date: new Date().toISOString(),
    };

    setHarvests((prev) => [record, ...prev]);
    setForm({ weight: "", grade: "เกรด A" });
    alert("บันทึกผลผลิตเรียบร้อย");
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-900 flex">
      {/* Sidebar */}
      <div className="hidden md:block w-56 lg:w-64 shrink-0 sticky top-0 h-screen bg-white shadow-md">
        <Sidebar />
      </div>

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">

        <HeaderWrapper title="บันทึกจำนวนผลทุเรียนที่เก็บเกี่ยวได้" subtitle="ระบุจำนวนผลผลิตแยกตามเกรดเพื่อให้เจ้าของสวนวางแผนการขาย" />


        <main className="p-4 sm:p-6 pt-28">
          <div className="max-w-2xl mx-auto space-y-4">
            {/* Form */}
            <Card>
              <form
                onSubmit={submit}
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                <div>
                  <label className="block text-sm text-slate-600 mb-1">
                    จำนวนผลผลิต (กิโล)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={form.weight}
                    onChange={handleChange("weight")}
                    placeholder="เช่น 850"
                    className="w-full border rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-600 mb-1">
                    คุณภาพทุเรียน
                  </label>
                  <select
                    value={form.grade}
                    onChange={handleChange("grade")}
                    className="w-full border rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    <option>เกรด A</option>
                    <option>เกรด B</option>
                    <option>เกรด C</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-emerald-700 text-white text-sm hover:bg-emerald-800"
                  >
                    บันทึกผลผลิต
                  </button>
                </div>
              </form>
            </Card>

            {/* History */}
            <Card>
              <h3 className="font-semibold text-slate-800 mb-2">
                ผลผลิตที่บันทึกล่าสุด
              </h3>
              <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left bg-slate-50 text-slate-600">
                      <th className="py-2 px-3">วันที่</th>
                      <th className="py-2 px-3">จำนวนผลผลิต</th>
                      <th className="py-2 px-3">คุณภาพทุเรียน</th>
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
                          {h.weight.toLocaleString("th-TH")} กิโลกรัม
                        </td>
                        <td className="py-2 px-3">{h.grade}</td>
                      </tr>
                    ))}
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
