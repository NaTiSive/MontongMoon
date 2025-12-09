import React, { useMemo, useState, useEffect } from "react";
import Sidebar from "../../components/Sidebar";
import HeaderWrapper from "../../components/HeaderWrapper";
import Card from "../../components/Card";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { getOwnerDeadline, createContract } from "../../api/contracts";

export default function BrokerSubmitOffer() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (!user || user.role !== "broker") navigate("/login");
  }, [user, navigate]);

  const [deadline, setDeadline] = useState(null);
  const [ctxLoading, setCtxLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setCtxLoading(true);
        const d = await getOwnerDeadline();
        if (!alive) return;
        setDeadline(d?.current_deadline_date ?? null);
      } finally {
        if (!alive) return;
        setCtxLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const now = Date.now();
  const isClosed = useMemo(() => (deadline ? new Date(deadline).getTime() <= now : false), [deadline, now]);

  const [form, setForm] = useState({
    priceCSV: "",
    qty: "",
    payMethod: "เงินสด",
    installments: "",
    note: "",
  });

  const update = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const submit = async () => {
    if (isClosed) return alert("เลยกำหนดปิดรับข้อเสนอแล้ว");

    const qty = Number(form.qty);
    if (!qty || qty <= 0) return alert("กรุณากรอกปริมาณให้ถูกต้อง");

    const parts = form.priceCSV.split(",").map((x) => Number(x.trim()));
    if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n) || n <= 0)) {
      return alert("รูปแบบราคาตามเกรดไม่ถูกต้อง (ต้องเป็น A,B,C เช่น 150,120,100)");
    }
    const [A, B, C] = parts;

    const extra = [];
    if (form.payMethod === "ผ่อนชำระ") {
      const n = Number(form.installments);
      if (!Number.isFinite(n) || n <= 0)
        return alert("กรุณาระบุจำนวนงวด (เดือน) ให้ถูกต้อง");
      extra.push(`[ผ่อนชำระ] ${n} งวด`);
    }
    if (form.note.trim()) extra.push(form.note.trim());

    try {
      await createContract({
        broker_id: user?.broker_id,
        qtt_estimate: qty,
        offerprice_by_grade: { A, B, C },
        payment_term: form.payMethod,
        note: extra.join(" | "),
      });
      alert("ส่งข้อเสนอสำเร็จ!");
      setForm({ priceCSV: "", qty: "", payMethod: "เงินสด", installments: "", note: "" });
      navigate("/broker/dashboard");
    } catch (e) {
      alert(e?.message || "ไม่สามารถส่งข้อเสนอได้");
    }
  };

  return (
    <div className={`min-h-screen w-full bg-slate-50 text-slate-900 flex flex-col md:flex-row ${isSidebarOpen ? "overflow-hidden md:overflow-auto" : ""}`}>
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      {isSidebarOpen && <div className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={() => setIsSidebarOpen(false)} />}

      <div className="flex-1 min-w-0 flex flex-col">
        <HeaderWrapper
          onMenuClick={() => setIsSidebarOpen(true)}
          title="ยื่นข้อเสนอ"
          subtitle="ส่งราคาและรายละเอียดให้เจ้าของสวน"
        />

        <main className="p-4 sm:p-6 pt-28">
          <div className="max-w-3xl mx-auto space-y-4">
            {isClosed && (
              <Card>
                <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-3">
                  * เลยกำหนดปิดรับข้อเสนอแล้ว
                </div>
              </Card>
            )}

            <Card>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* ✅ ราคาตามเกรด */}
                <div className="md:col-span-2">
                  <label className="block text-sm text-slate-600 mb-1">ราคาตามเกรด (A,B,C)</label>
                  <input
                    type="text"
                    disabled={isClosed}
                    value={form.priceCSV}
                    onChange={update("priceCSV")}
                    placeholder='เช่น 150,120,100 (รูปแบบ "A,B,C")'
                    className="w-full border rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-500 outline-none disabled:bg-gray-100"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    ตัวอย่าง: <span className="font-medium">150,120,100</span> หมายถึง A=150, B=120, C=100 บาท/กก.
                  </p>
                </div>

                <div>
                  <label className="block text-sm text-slate-600 mb-1">ปริมาณที่ต้องการ (กิโลกรัม)</label>
                  <input
                    type="number"
                    min="0"
                    disabled={isClosed}
                    value={form.qty}
                    onChange={update("qty")}
                    placeholder="เช่น 1000"
                    className="w-full border rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-500 outline-none disabled:bg-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-600 mb-1">วิธีการชำระเงิน</label>
                  <select
                    disabled={isClosed}
                    value={form.payMethod}
                    onChange={update("payMethod")}
                    className="w-full border rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-500 outline-none disabled:bg-gray-100"
                  >
                    <option>เงินสด</option>
                    <option>โอนเงิน</option>
                    <option>ผ่อนชำระ</option>
                    <option>อื่นๆ</option>
                  </select>
                  {form.payMethod === "ผ่อนชำระ" && (
                    <div className="mt-2">
                      <label className="block text-sm text-slate-600 mb-1">จำนวนงวด (เดือน)</label>
                      <input
                        type="number"
                        min="1"
                        disabled={isClosed}
                        value={form.installments}
                        onChange={update("installments")}
                        placeholder="เช่น 3"
                        className="w-full border rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-500 outline-none disabled:bg-gray-100"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-3">
                <label className="block text-sm text-slate-600 mb-1">หมายเหตุ / รายละเอียดเพิ่มเติม</label>
                <input
                  disabled={isClosed}
                  value={form.note}
                  onChange={update("note")}
                  placeholder="เช่น รถยก / กำหนดขนส่ง"
                  className="w-full border rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-500 outline-none disabled:bg-gray-100"
                />
              </div>

              <button
                onClick={submit}
                disabled={isClosed}
                className={`mt-4 px-4 py-2 rounded-lg text-white text-sm ${
                  isClosed ? "bg-slate-400 cursor-not-allowed" : "bg-emerald-700 hover:bg-emerald-800"
                }`}
              >
                ส่งข้อเสนอซื้อ
              </button>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
