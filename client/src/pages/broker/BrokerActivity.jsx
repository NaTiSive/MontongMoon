// src/pages/broker/BrokerActivity.jsx
import React, { useMemo, useState } from "react";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import Card from "../../components/Card";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import HeaderWrapper from "../../components/HeaderWrapper";

export default function BrokerActivity() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (!user || user.role !== "broker") {
      navigate("/login");
    }
  }, [user, navigate]);

  // ตัวอย่าง Tree ที่ค้นหาได้ (จริงให้ดึงจาก API)
  const trees = useMemo(
    () => ["T-001", "T-012", "T-032", "T-045", "T-101", "T-115", "T-203"],
    []
  );

  // รายการประเภจกิจกรรม (ปรับเพิ่มได้)
  const categories = ["รายต้น", "ภาพรวม", "อื่น ๆ"];

  const [form, setForm] = useState({
    treeId: "",
    category: categories[0],
    detail: "",
  });

  const onChange = (k) => (e) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    if (!form.treeId.trim()) return alert("กรุณากรอกหมายเลขต้นทุเรียน");
    if (!form.detail.trim()) return alert("กรุณากรอกรายละเอียดกิจกรรม");

    // call API จริงตรงนี้
    console.log("save activity:", form);

    alert("บันทึกกิจกรรมเรียบร้อย");
    setForm({ treeId: "", category: categories[0], detail: "" });
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
          title="บันทึกกิจกรรม"
          subtitle="กรอกกิจกรรมระหว่างวันในสวน"
        />
        <main className="p-4 sm:p-6 pt-28">
          <div className="max-w-3xl mx-auto">
            <Card>
              <form onSubmit={submit} className="space-y-4">
                {/* Row: Tree ID + Category */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-slate-600 mb-1">
                      หมายเลขต้นทุเรียน (Tree ID)
                    </label>
                    {/* ใช้ datalist ช่วยค้นหา/เติมอัตโนมัติ */}
                    <input
                      list="tree-list"
                      value={form.treeId}
                      onChange={onChange("treeId")}
                      placeholder="ค้นหาและเลือกหมายเลขต้น"
                      className="w-full border rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                    <datalist id="tree-list">
                      {trees.map((t) => (
                        <option key={t} value={t} />
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label className="block text-sm text-slate-600 mb-1">
                      ประเภจกิจกรรม
                    </label>
                    <select
                      value={form.category}
                      onChange={onChange("category")}
                      className="w-full border rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                    >
                      {categories.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Detail */}
                <div>
                  <label className="block text-sm text-slate-600 mb-1">
                    รายละเอียดกิจกรรม
                  </label>
                  <textarea
                    rows={6}
                    value={form.detail}
                    onChange={onChange("detail")}
                    placeholder="ระบุสิ่งที่ทำ ปริมาณวัสดุ เวลา หรือข้อสังเกต"
                    className="w-full border rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-700 text-white text-sm hover:bg-emerald-800"
                >
                  บันทึกกิจกรรม
                </button>
              </form>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
