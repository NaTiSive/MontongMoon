import React, { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";
import HeaderWrapper from "../../components/HeaderWrapper";
import Card from "../../components/Card";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

export default function BrokerActivity() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (!user || user.role !== "broker") navigate("/login");
  }, [user, navigate]);

  const disabled = user?.approvalStatus !== "approved";

  // mock form
  const [form, setForm] = useState({ treeId: "", category: "ตัดแต่งกิ่ง", detail: "" });
  const update = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const submit = () => {
    if (disabled) return;
    if (!form.treeId || !form.detail) return alert("กรุณากรอกข้อมูลให้ครบ");
    alert("บันทึกกิจกรรมสำเร็จ (mock)");
    setForm({ treeId: "", category: "ตัดแต่งกิ่ง", detail: "" });
  };

  return (
    <div className={`min-h-screen w-full bg-slate-50 text-slate-900 flex flex-col md:flex-row ${
      isSidebarOpen ? "overflow-hidden md:overflow-auto" : ""
    }`}>
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <HeaderWrapper
          onMenuClick={() => setIsSidebarOpen(true)}
          title="บันทึกกิจกรรม"
          subtitle="บันทึกงานภาคสนาม (สำหรับบัญชีที่ได้รับอนุมัติ)"
        />

        <main className="p-4 sm:p-6 pt-28">
          <div className="max-w-3xl mx-auto space-y-4">
            {disabled && (
              <Card>
                <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  บัญชีของคุณยังไม่ได้รับการอนุมัติ — ฟอร์มนี้ถูกปิดการใช้งานชั่วคราว
                </div>
              </Card>
            )}

            <Card>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-slate-600 mb-1">รหัสต้น</label>
                  <input
                    value={form.treeId}
                    onChange={update("treeId")}
                    disabled={disabled}
                    className="w-full border rounded-lg px-3 py-2 bg-white disabled:bg-slate-100"
                    placeholder="เช่น T-102"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-1">ประเภทกิจกรรม</label>
                  <select
                    value={form.category}
                    onChange={update("category")}
                    disabled={disabled}
                    className="w-full border rounded-lg px-3 py-2 bg-white disabled:bg-slate-100"
                  >
                    <option>ตัดแต่งกิ่ง</option>
                    <option>พ่นยา</option>
                    <option>ให้น้ำ</option>
                    <option>ใส่ปุ๋ย</option>
                  </select>
                </div>
              </div>

              <div className="mt-3">
                <label className="block text-sm text-slate-600 mb-1">รายละเอียด</label>
                <textarea
                  value={form.detail}
                  onChange={update("detail")}
                  disabled={disabled}
                  className="w-full border rounded-lg px-3 py-2 bg-white disabled:bg-slate-100"
                  rows={3}
                  placeholder="อธิบายงานที่ทำ / สภาพแวดล้อม"
                />
              </div>

              <button
                onClick={submit}
                disabled={disabled}
                className={`mt-4 px-4 py-2 rounded-lg text-white text-sm ${
                  disabled ? "bg-slate-400 cursor-not-allowed" : "bg-emerald-700 hover:bg-emerald-800"
                }`}
              >
                บันทึกกิจกรรม
              </button>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
