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
  listBrokerContracts,
} from "../../api/contracts";

export default function BrokerSubmitOffer() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (!user || user.role !== "broker") {
      navigate("/login");
    }
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

  // ประวัติของฉัน
  const [history, setHistory] = useState([]);

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
        const mine = user ? await listBrokerContracts(user.broker_id) : [];
        if (!alive) return;
        setDeadline(d?.current_deadline_date ?? null);
        setSummary(s);
        setHistory(mine);
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

  // ฟอร์ม
  const [form, setForm] = useState({
    price: "", // รับ “ราคาเดียวทุกเกรด” (mock ง่าย ๆ) — ถ้าอยากแยก A/B/C จะปรับเพิ่มทีหลังได้
    qty: "",
    payMethod: "เงินสด",
    note: "",
  });

  const update = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const fmtDT = (iso) =>
    new Date(iso).toLocaleString("th-TH", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const now = Date.now();
  const isClosed = useMemo(() => {
    if (!deadline) return false;
    const t = new Date(deadline).getTime();
    return Number.isFinite(t) ? t <= now : false;
  }, [deadline, now]);

  const statusStyle = {
    ปกติ: {
      box: "bg-emerald-100",
      text: "text-emerald-700",
      border: "border-emerald-300",
    },
    มีปัญหา: {
      box: "bg-rose-100",
      text: "text-rose-700",
      border: "border-rose-300",
    },
    ออกดอก: {
      box: "bg-sky-100",
      text: "text-sky-700",
      border: "border-sky-300",
    },
    ออกผล: {
      box: "bg-amber-100",
      text: "text-amber-700",
      border: "border-amber-300",
    },
  };

  const treeStatus = (summary?.byStatus || []).map((s) => ({
    key: s.status,
    count: s.count,
    ...(statusStyle[s.status] || {
      box: "bg-gray-100",
      text: "text-gray-700",
      border: "border-gray-300",
    }),
  }));

  const submit = async () => {
    const price = Number(form.price);
    const qty = Number(form.qty);
    const term = String(form.payMethod || "").trim();

    if (isClosed) return alert("เลยกำหนดปิดรับข้อเสนอแล้ว");
    if (!Number.isFinite(qty) || qty <= 0) return alert("ปริมาณต้องมากกว่า 0");
    if (!Number.isFinite(price) || price <= 0)
      return alert("ราคาต้องมากกว่า 0");
    if (!term) return alert("กรุณาเลือกวิธีการชำระเงิน");

    try {
      const row = await createContract({
        broker_id: user?.broker_id,
        qtt_estimate: qty,
        offerprice: price, // mock: ราคาเดียวทุกเกรด
        payment_term: term,
        note: form.note?.trim() || "",
      });

      const rec = {
        id: row.contract_id,
        submittedAt: row.contract_date,
        deadline: deadline || row.contract_deadline,
        qty,
        price,
        payMethod: term,
        note: row.note || "-",
        status: row.status,
      };
      setHistory((h) => [rec, ...h]);
      setForm({ price: "", qty: "", payMethod: "เงินสด", note: "" });
      alert(`ส่งข้อเสนอสำเร็จ\nหมายเลขสัญญา: ${row.contract_id}`);
      navigate("/broker/dashboard");
    } catch (e) {
      alert(e?.message || "ส่งข้อเสนอไม่สำเร็จ");
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
            {/* สถานะบัญชี (แจ้งเตือนเฉยๆ สำหรับ pending) */}
            {user?.approvalStatus === "pending" && (
              <Card>
                <div className="text-sm text-sky-700 bg-sky-50 border border-sky-200 rounded-lg p-3">
                  บัญชีของคุณยัง “รออนุมัติ” — คุณสามารถยื่นข้อเสนอได้
                  ข้อเสนอที่ถูก “ยอมรับ” จะทำให้บัญชีของคุณได้รับการอนุมัติ
                </div>
              </Card>
            )}

            {/* สรุปต้นทุเรียน */}
            <Card>
              {ctxLoading ? (
                <div className="text-sm text-slate-500">
                  กำลังโหลดข้อมูลสรุป...
                </div>
              ) : ctxError ? (
                <div className="text-sm text-rose-600">{ctxError}</div>
              ) : (
                <>
                  <h3 className="font-semibold text-slate-800 mb-3">
                    สถานะต้นทุเรียนในสวน
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {treeStatus.map((s) => (
                      <div
                        key={s.key}
                        className={`rounded-xl border ${s.border} bg-white shadow-sm`}
                      >
                        <div className={`px-4 py-5 rounded-xl ${s.box}`}>
                          <div className={`text-sm ${s.text}`}>{s.key}</div>
                          <div className="mt-1 text-2xl font-semibold">
                            {s.count}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 text-xs text-slate-600">
                    ต้นทั้งหมด (ไม่รวมปัญหาเปิดอยู่):{" "}
                    <b>
                      {(summary.totalTrees || 0) - (summary.problemsOpen || 0)}
                    </b>{" "}
                    | ปัญหาที่ยังไม่ปิด: <b>{summary.problemsOpen || 0}</b>
                  </div>
                </>
              )}
            </Card>

            {/* กำหนดปิดรับข้อเสนอ */}
            <Card>
              <h3 className="font-semibold text-slate-800 mb-2">
                กำหนดปิดรับข้อเสนอจากฝ่ายเจ้าของสวน
              </h3>
              <div className="rounded-lg border bg-slate-50 p-3">
                <div className="text-sm text-slate-500">ปิดรับข้อเสนอเมื่อ</div>
                <div className="text-base font-semibold">
                  {deadline ? fmtDT(deadline) : "-"}
                </div>
              </div>
              {isClosed && (
                <div className="mt-2 text-sm text-rose-600">
                  * เลยกำหนดปิดรับข้อเสนอแล้ว ไม่สามารถส่งข้อเสนอใหม่ได้
                </div>
              )}
            </Card>

            {/* ฟอร์มยื่นข้อเสนอ */}
            <Card>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-slate-600 mb-1">
                    ราคาที่เสนอ (บาทต่อกิโลกรัม)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={form.price}
                    onChange={update("price")}
                    placeholder="เช่น 120"
                    className="w-full border rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-1">
                    ปริมาณที่ต้องการ (กิโลกรัม)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.qty}
                    onChange={update("qty")}
                    placeholder="เช่น 1000"
                    className="w-full border rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div className="mt-3">
                <label className="block text-sm text-slate-600 mb-1">
                  วิธีการชำระเงิน
                </label>
                <select
                  value={form.payMethod}
                  onChange={update("payMethod")}
                  className="w-full border rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="เงินสด">เงินสด</option>
                  <option value="โอนเงิน">โอนเงิน</option>
                  <option value="ผ่อนชำระ">ผ่อนชำระ</option>
                  <option value="อื่นๆ">อื่นๆ</option>
                </select>
              </div>

              <div className="mt-3">
                <label className="block text-sm text-slate-600 mb-1">
                  หมายเหตุ / รายละเอียดเพิ่มเติม
                </label>
                <input
                  value={form.note}
                  onChange={update("note")}
                  placeholder="ระบุเงื่อนไขเพิ่มเติม เช่น รถยก/กำหนดการขนส่ง"
                  className="w-full border rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <button
                onClick={submit}
                disabled={isClosed}
                className={`mt-4 px-4 py-2 rounded-lg text-white text-sm ${
                  isClosed
                    ? "bg-slate-400 cursor-not-allowed"
                    : "bg-emerald-700 hover:bg-emerald-800"
                }`}
              >
                ส่งข้อเสนอซื้อ
              </button>
            </Card>

            {/* ประวัติการยื่นข้อเสนอของคุณ */}
            {history.length > 0 && (
              <Card>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-slate-800">
                    ประวัติยื่นข้อเสนอของคุณ
                  </h3>
                  <div className="text-xs text-slate-500">
                    ทั้งหมด {history.length} รายการ
                  </div>
                </div>
                <div className="space-y-3">
                  {history.map((h) => (
                    <div
                      key={h.contract_id || h.id}
                      className="rounded-xl bg-white shadow-sm p-4"
                    >
                      <div className="text-sm text-slate-600 mb-1">
                        ส่งเมื่อ: {fmtDT(h.contract_date || h.submittedAt)} •
                        สถานะ: {h.status}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-sm">
                        <Info
                          label="ปริมาณทั้งหมด"
                          value={`${(h.qtt_estimate ?? h.qty).toLocaleString(
                            "th-TH"
                          )} กก.`}
                        />
                        <Info
                          label="ราคาที่เสนอ"
                          value={`${(h.offerprice ?? h.price).toLocaleString(
                            "th-TH"
                          )} บาท/กก.`}
                        />
                        <Info
                          label="วิธีการชำระเงิน"
                          value={h.payment_term ?? h.payMethod}
                        />
                        <Info label="หมายเหตุ" value={h.note || "-"} />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <div className="text-slate-500">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
