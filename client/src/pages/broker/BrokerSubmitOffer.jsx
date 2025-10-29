// src/pages/broker/BrokerSubmitOffer.jsx
import React, { useMemo, useState, useEffect } from "react";
import Sidebar from "../../components/Sidebar";
import HeaderWrapper from "../../components/HeaderWrapper";
import Card from "../../components/Card";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  getOwnerDeadline,
  getBrokerSubmissionContext,
  createContract,
  getBrokerApproval,
  hasActiveOfferForCycle, // 👈 เพิ่มตัวนี้
} from "../../api/contracts";

export default function BrokerSubmitOffer() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (!user || user.role !== "broker") navigate("/login");
  }, [user, navigate]);

  // โหลด deadline + สรุป
  const [deadline, setDeadline] = useState(null);
  const [summary, setSummary] = useState({ totalTrees: 0, problemsOpen: 0, byStatus: [] });
  const [ctxLoading, setCtxLoading] = useState(true);
  const [ctxError, setCtxError] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setCtxLoading(true);
        const d = await getOwnerDeadline();
        const s = await getBrokerSubmissionContext({ broker_id: user?.broker_id, owner_id: 1 });
        if (!alive) return;
        setDeadline(d?.current_deadline_date ?? null);
        setSummary(s);
      } catch (e) {
        if (!alive) return;
        setCtxError(e?.message || "โหลดข้อมูลไม่สำเร็จ");
      } finally {
        if (!alive) return;
        setCtxLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [user]);

  // สถานะอนุมัติล่าสุด + คุณสมบัติในการยื่น
  const latest = user?.broker_id != null ? getBrokerApproval(user.broker_id) : "pending";
  const now = Date.now();
  const isClosed = useMemo(() => (deadline ? new Date(deadline).getTime() <= now : false), [deadline, now]);

  // มีข้อเสนอ active ในรอบนี้อยู่แล้วหรือยัง?
  const alreadyActiveInCycle = useMemo(() => {
    if (!user?.broker_id) return false;
    return hasActiveOfferForCycle({ broker_id: user.broker_id, cycle_deadline: deadline });
  }, [user?.broker_id, deadline]);

  // ✅ เงื่อนไขอนุญาตให้ “ยื่นได้”
  // - อนุมัติแล้ว: ยื่นได้ (เว้นแต่คุณจะจำกัด 1 ข้อเสนอ/รอบ ก็ใช้ alreadyActiveInCycle ร่วมด้วย)
  // - ยัง pending: ยื่นได้ถ้า "ยังไม่เคยยื่น/ไม่มี active offer" ในรอบนี้
  const eligibleToSubmit =
    latest === "approved" ? !alreadyActiveInCycle : !alreadyActiveInCycle;

  // อินพุตจะปิดถ้า "ไม่เข้าข่ายยื่น" หรือ "เลยกำหนด"
  const disabled = !eligibleToSubmit || isClosed;

  // ฟอร์ม
  const [form, setForm] = useState({ price: "", qty: "", payMethod: "เงินสด", note: "" });
  const [history, setHistory] = useState([]);

  const fmtDT = (iso) =>
    new Date(iso).toLocaleString("th-TH", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const update = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const submit = async () => {
    if (!eligibleToSubmit) {
      if (latest !== "approved" && alreadyActiveInCycle) {
        return alert("คุณได้ยื่นข้อเสนอในรอบนี้แล้ว กรุณารอการพิจารณา");
      }
      return alert("บัญชีของคุณยังไม่ได้รับอนุมัติ");
    }
    if (isClosed) return alert("เลยกำหนดปิดรับข้อเสนอแล้ว");

    const price = Number(form.price);
    const qty = Number(form.qty);
    if (!price || price <= 0) return alert("กรุณากรอกราคาให้ถูกต้อง");
    if (!qty || qty <= 0) return alert("กรุณากรอกปริมาณให้ถูกต้อง");

    try {
      const row = await createContract({
        broker_id: user?.broker_id,
        qtt_estimate: qty,
        offerprice: price,
        payment_term: form.payMethod,
        note: form.note?.trim() || "",
      });
      setHistory((h) => [row, ...h]);
      setForm({ price: "", qty: "", payMethod: "เงินสด", note: "" });
      alert("ส่งข้อเสนอสำเร็จ");
      navigate("/broker/dashboard");
    } catch (e) {
      alert(e?.message || "ส่งข้อเสนอไม่สำเร็จ");
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

            {/* แบนเนอร์ตามสถานะ */}
            {latest !== "approved" && !alreadyActiveInCycle && !isClosed && (
              <Card>
                <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                  บัญชีของคุณยัง <b>รอการอนุมัติ</b> แต่คุณยังสามารถ<strong>ยื่นข้อเสนอได้ 1 ครั้งในรอบนี้</strong>
                </div>
              </Card>
            )}
            {latest !== "approved" && alreadyActiveInCycle && (
              <Card>
                <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  คุณได้ยื่นข้อเสนอในรอบนี้แล้ว กรุณารอการพิจารณา
                </div>
              </Card>
            )}
            {isClosed && (
              <Card>
                <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-3">
                  * เลยกำหนดปิดรับข้อเสนอแล้ว
                </div>
              </Card>
            )}

            {/* (ส่วนสรุป ฯลฯ ของคุณคงเดิม) */}

            <Card>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-slate-600 mb-1">ราคาที่เสนอ (บาทต่อกิโลกรัม)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    disabled={disabled}
                    value={form.price}
                    onChange={update("price")}
                    placeholder="เช่น 120"
                    className="w-full border rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-500 outline-none disabled:bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-1">ปริมาณที่ต้องการ (กิโลกรัม)</label>
                  <input
                    type="number"
                    min="0"
                    disabled={disabled}
                    value={form.qty}
                    onChange={update("qty")}
                    placeholder="เช่น 1000"
                    className="w-full border rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-500 outline-none disabled:bg-gray-100"
                  />
                </div>
              </div>

              <div className="mt-3">
                <label className="block text-sm text-slate-600 mb-1">วิธีการชำระเงิน</label>
                <select
                  disabled={disabled}
                  value={form.payMethod}
                  onChange={update("payMethod")}
                  className="w-full border rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-500 outline-none disabled:bg-gray-100"
                >
                  <option>เงินสด</option>
                  <option>โอนเงิน</option>
                  <option>อื่นๆ</option>
                </select>
              </div>

              <div className="mt-3">
                <label className="block text-sm text-slate-600 mb-1">หมายเหตุ / รายละเอียดเพิ่มเติม</label>
                <input
                  disabled={disabled}
                  value={form.note}
                  onChange={update("note")}
                  placeholder="ระบุเงื่อนไขเพิ่มเติม เช่น รถยก/กำหนดการขนส่ง"
                  className="w-full border rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-500 outline-none disabled:bg-gray-100"
                />
              </div>

              <button
                onClick={submit}
                disabled={disabled}
                className={`mt-4 px-4 py-2 rounded-lg text-white text-sm ${
                  disabled ? "bg-slate-400 cursor-not-allowed" : "bg-emerald-700 hover:bg-emerald-800"
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
