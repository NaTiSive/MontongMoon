import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "../../components/Sidebar";
import HeaderWrapper from "../../components/HeaderWrapper";
import Card from "../../components/Card";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { listBrokerContracts } from "../../api/contracts";

export default function BrokerTransaction() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (!user || user.role !== "broker") navigate("/login");
  }, [user, navigate]);

  const disabled = user?.approvalStatus !== "approved";

  const [accepted, setAccepted] = useState([]);
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!user) return;
      const mine = await listBrokerContracts(user.broker_id);
      const acc = mine.filter((c) => c.status === "ยอมรับ");
      if (alive) setAccepted(acc);
    })();
    return () => { alive = false; };
  }, [user]);

  // mock ledger
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ desc: "", type: "รายรับ", amount: "" });
  const update = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const total = useMemo(() => {
    return rows.reduce((sum, r) => sum + (r.type === "รายรับ" ? r.amount : -r.amount), 0);
  }, [rows]);

  const add = () => {
    if (disabled) return;
    const amt = Number(form.amount);
    if (!form.desc || !Number.isFinite(amt) || amt <= 0) return alert("กรอกข้อมูลให้ถูกต้อง");
    setRows((r) => [{ id: crypto.randomUUID(), ...form, amount: amt }, ...r]);
    setForm({ desc: "", type: "รายรับ", amount: "" });
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
          title="ธุรกรรมนายหน้า"
          subtitle="บันทึกรายรับรายจ่าย (เฉพาะบัญชีที่ได้รับอนุมัติ)"
        />

        <main className="p-4 sm:p-6 pt-28">
          <div className="max-w-4xl mx-auto space-y-4">
            {disabled && (
              <Card>
                <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  บัญชีของคุณยังไม่ได้รับอนุมัติ — ฟีเจอร์นี้ถูกปิดการใช้งาน
                </div>
              </Card>
            )}

            <Card>
              <h3 className="font-semibold mb-2">สัญญาที่ถูกยอมรับของฉัน</h3>
              {accepted.length === 0 ? (
                <div className="text-sm text-slate-600">ยังไม่มีสัญญาถูกยอมรับ</div>
              ) : (
                <ul className="text-sm list-disc pl-6">
                  {accepted.map((c) => (
                    <li key={c.contract_id}>
                      #{c.contract_id} — {new Date(c.contract_date).toLocaleString("th-TH")} — {c.offerprice} บาท/กก.
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card>
              <h3 className="font-semibold mb-2">เพิ่มรายการ</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  placeholder="คำอธิบาย"
                  value={form.desc}
                  onChange={update("desc")}
                  disabled={disabled}
                  className="border rounded-lg px-3 py-2 disabled:bg-slate-100"
                />
                <select
                  value={form.type}
                  onChange={update("type")}
                  disabled={disabled}
                  className="border rounded-lg px-3 py-2 disabled:bg-slate-100"
                >
                  <option>รายรับ</option>
                  <option>รายจ่าย</option>
                </select>
                <input
                  type="number"
                  placeholder="จำนวนเงิน"
                  value={form.amount}
                  onChange={update("amount")}
                  disabled={disabled}
                  className="border rounded-lg px-3 py-2 disabled:bg-slate-100"
                />
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

            <Card>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">รายการทั้งหมด</h3>
                <div className="text-sm">ยอดสุทธิ: <b>{total.toLocaleString("th-TH")}</b> บาท</div>
              </div>
              {rows.length === 0 ? (
                <div className="text-sm text-slate-600 mt-2">ยังไม่มีรายการ</div>
              ) : (
                <div className="mt-2 space-y-2">
                  {rows.map((r) => (
                    <div key={r.id} className="border rounded-lg p-2 text-sm flex justify-between">
                      <div>{r.desc} • {r.type}</div>
                      <div>{r.amount.toLocaleString("th-TH")} บาท</div>
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
