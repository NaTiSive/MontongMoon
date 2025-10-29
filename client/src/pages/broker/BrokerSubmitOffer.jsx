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
  hasActiveOfferForCycle,
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
  const [summary, setSummary] = useState({
    totalTrees: 0,
    problemsOpen: 0,
    byStatus: [],
  });
  const [ctxLoading, setCtxLoading] = useState(true);
  const [ctxError, setCtxError] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setCtxLoading(true);
        const d = await getOwnerDeadline();
        const s = await getBrokerSubmissionContext({
          broker_id: user?.broker_id,
          owner_id: 1,
        });
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
    return () => {
      alive = false;
    };
  }, [user]);

  // สถานะอนุมัติ + เงื่อนไขยื่น
  const latest =
    user?.broker_id != null ? getBrokerApproval(user.broker_id) : "pending";
  const now = Date.now();
  const isClosed = useMemo(
    () => (deadline ? new Date(deadline).getTime() <= now : false),
    [deadline, now]
  );

  const alreadyActiveInCycle = useMemo(() => {
    if (!user?.broker_id) return false;
    return hasActiveOfferForCycle({
      broker_id: user.broker_id,
      cycle_deadline: deadline,
    });
  }, [user?.broker_id, deadline]);

  const eligibleToSubmit =
    latest === "approved" ? !alreadyActiveInCycle : !alreadyActiveInCycle;

  const disabled = !eligibleToSubmit || isClosed;

  // ฟอร์ม
  const [form, setForm] = useState({
    price: "", // ราคาต่อกก. (กรณีเสนอราคาเดียว)
    priceCSV: "", // ราคาตามเกรด "A,B,C" เช่น "150,120,100"
    qty: "",
    payMethod: "เงินสด", // เงินสด | โอนเงิน | ผ่อนชำระ | อื่นๆ
    installments: "", // จำนวนงวด (เดือน) - แสดงเมื่อเลือกผ่อนชำระ
    note: "",
  });
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

  const parseGradePrices = (csv) => {
    if (!csv || !csv.trim()) return null;
    const parts = csv.split(",").map((s) => Number(String(s).trim()));
    if (
      parts.length !== 3 ||
      parts.some((n) => !Number.isFinite(n) || n <= 0)
    ) {
      return null;
    }
    return { A: parts[0], B: parts[1], C: parts[2] };
  };

const submit = async () => {
  if (!eligibleToSubmit) return alert("บัญชีของคุณยังไม่ได้รับอนุมัติหรือได้ยื่นแล้ว");
  if (isClosed) return alert("เลยกำหนดปิดรับข้อเสนอแล้ว");

  const qty = Number(form.qty);
  if (!qty || qty <= 0) return alert("กรุณากรอกปริมาณให้ถูกต้อง");

  // ✅ บังคับราคาตามเกรด
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
    navigate("/broker/dashboard");
  } catch (e) {
    alert(e.message || "ไม่สามารถส่งข้อเสนอได้");
  }
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
          title="ยื่นข้อเสนอ"
          subtitle="ส่งราคาและรายละเอียดให้เจ้าของสวน"
        />

        <main className="p-4 sm:p-6 pt-28">
          <div className="max-w-3xl mx-auto space-y-4">
            {/* แบนเนอร์ตามสถานะ */}
            {latest !== "approved" && !alreadyActiveInCycle && !isClosed && (
              <Card>
                <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                  บัญชีของคุณยัง <b>รอการอนุมัติ</b> แต่คุณยังสามารถ
                  <strong>ยื่นข้อเสนอได้ 1 ครั้งในรอบนี้</strong>
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
            
            <Card>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* ✅ ราคาตามเกรด */}
                <div className="md:col-span-2">
                  <label className="block text-sm text-slate-600 mb-1">
                    ราคาตามเกรด (A,B,C)
                  </label>
                  <input
                    type="text"
                    disabled={disabled}
                    value={form.priceCSV}
                    onChange={update("priceCSV")}
                    placeholder='เช่น 150,120,100 (รูปแบบ "A,B,C")'
                    className="w-full border rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-500 outline-none disabled:bg-gray-100"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    ตัวอย่าง: <span className="font-medium">150,120,100</span>{" "}
                    หมายถึง A=150, B=120, C=100 (บาท/กก.)
                  </p>
                </div>

                {/* ปริมาณที่ต้องการ */}
                <div>
                  <label className="block text-sm text-slate-600 mb-1">
                    ปริมาณที่ต้องการ (กิโลกรัม)
                  </label>
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

                {/* วิธีการชำระเงิน */}
                <div>
                  <label className="block text-sm text-slate-600 mb-1">
                    วิธีการชำระเงิน
                  </label>
                  <select
                    disabled={disabled}
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
                      <label className="block text-sm text-slate-600 mb-1">
                        จำนวนงวด (เดือน)
                      </label>
                      <input
                        type="number"
                        min="1"
                        disabled={disabled}
                        value={form.installments}
                        onChange={update("installments")}
                        placeholder="เช่น 3"
                        className="w-full border rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-500 outline-none disabled:bg-gray-100"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        ระบบจะบันทึกรายละเอียดการผ่อนชำระลงในหมายเหตุของข้อเสนอ
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* หมายเหตุ */}
              <div className="mt-3">
                <label className="block text-sm text-slate-600 mb-1">
                  หมายเหตุ / รายละเอียดเพิ่มเติม
                </label>
                <input
                  disabled={disabled}
                  value={form.note}
                  onChange={update("note")}
                  placeholder="เช่น รถยก / กำหนดขนส่ง"
                  className="w-full border rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-500 outline-none disabled:bg-gray-100"
                />
              </div>

              <button
                onClick={submit}
                disabled={disabled}
                className={`mt-4 px-4 py-2 rounded-lg text-white text-sm ${
                  disabled
                    ? "bg-slate-400 cursor-not-allowed"
                    : "bg-emerald-700 hover:bg-emerald-800"
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
