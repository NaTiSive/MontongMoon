// src/pages/broker/BrokerSubmitOffer.jsx
import React, { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import Card from "../../components/Card";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import HeaderWrapper from "../../components/HeaderWrapper";

export default function BrokerSubmitOffer() {
  const { state } = useLocation();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || user.role !== "broker") {
      navigate("/login");
    }
  }, [user, navigate]);
  // ดึงกำหนดปิดรับข้อเสนอที่ “เจ้าของสวน” ตั้งไว้ (ถ้าไม่ส่งมา ใช้ mock)
  const deadline = state?.deadline ?? "2025-12-04T07:00:00";

  // ===== Mock (สรุปสถานะต้นในสวน) =====
  const treeStatus = [
    {
      key: "ปกติ",
      count: 2,
      box: "bg-emerald-100",
      text: "text-emerald-700",
      border: "border-emerald-300",
    },
    {
      key: "มีปัญหา",
      count: 1,
      box: "bg-rose-100",
      text: "text-rose-700",
      border: "border-rose-300",
    },
    {
      key: "ออกดอก",
      count: 1,
      box: "bg-sky-100",
      text: "text-sky-700",
      border: "border-sky-300",
    },
    {
      key: "ออกผล",
      count: 1,
      box: "bg-amber-100",
      text: "text-amber-700",
      border: "border-amber-300",
    },
  ];

  // ===== ฟอร์ม =====
  const [form, setForm] = useState({
    price: "", // บาท/กิโลกรัม
    qty: "", // กิโลกรัม
    payMethod: "เงินสด",
    note: "",
  });

  // ===== ประวัติการยื่นข้อเสนอ (mock) =====
  const [history, setHistory] = useState([
    {
      id: "H-002",
      submittedAt: "2025-10-03T02:39:00",
      deadline,
      qty: 1000,
      price: 120,
      payMethod: "cash",
      note: "ของเกรด A",
      status: "รอการพิจารณา",
    },
  ]);

  // ===== Helpers =====
  const fmtDT = (iso) =>
    new Date(iso).toLocaleString("th-TH", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const now = Date.now();
  const isClosed = useMemo(
    () => new Date(deadline).getTime() <= now,
    [deadline, now]
  );

  const update = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const submit = () => {
    const price = Number(form.price);
    const qty = Number(form.qty);
    if (!price || price <= 0)
      return alert("กรุณากรอกราคา (บาท/กิโลกรัม) ให้ถูกต้อง");
    if (!qty || qty <= 0) return alert("กรุณากรอกปริมาณ (กิโลกรัม) ให้ถูกต้อง");
    if (isClosed) return alert("เลยกำหนดปิดรับข้อเสนอแล้ว");

    const rec = {
      id: `H-${String(history.length + 1).padStart(3, "0")}`,
      submittedAt: new Date().toISOString(),
      deadline,
      qty,
      price,
      payMethod: form.payMethod,
      note: form.note?.trim() || "-",
      status: "รอการพิจารณา",
    };
    setHistory((h) => [rec, ...h]);
    setForm({ price: "", qty: "", payMethod: "เงินสด", note: "" });
    alert("ส่งข้อเสนอเรียบร้อย");
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-900 flex">
      {/* Sidebar */}
      <div className="hidden md:block w-56 lg:w-64 shrink-0 sticky top-0 h-screen bg-white shadow-md">
        <Sidebar />
      </div>

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">

        <HeaderWrapper title="ยื่นข้อเสนอซื้อทุเรียนจากสวน" subtitle="โปรดระบุรายละเอียดที่ชัดเจนเพื่อให้เจ้าของสวนพิจารณาและตอบรับอย่างรวดเร็ว" />


        <main className="p-4 sm:p-6 pt-28">
          <div className="max-w-3xl mx-auto space-y-4">
            {/* สรุปสถานะต้น */}
            <Card>
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
            </Card>

            {/* กำหนดปิดรับข้อเสนอ */}
            <Card>
              <h3 className="font-semibold text-slate-800 mb-2">
                กำหนดปิดรับข้อเสนอจากฝ่ายเจ้าของสวน
              </h3>
              <div className="rounded-lg border bg-slate-50 p-3">
                <div className="text-sm text-slate-500">ปิดรับข้อเสนอเมื่อ</div>
                <div className="text-base font-semibold">{fmtDT(deadline)}</div>
                <p className="text-xs text-slate-500 mt-2">
                  โปรดส่งข้อเสนอภายในเวลาที่กำหนดเพื่อให้เจ้าของสวนพิจารณาได้ทันเวลา
                </p>
                <p className="text-xs text-slate-400">
                  อัปเดตล่าสุด 3 ต.ค. 2568 02:13
                </p>
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
                  <option>เงินสด</option>
                  <option>โอนเงิน</option>
                  <option>เช็ค</option>
                </select>
              </div>

              <div className="mt-3">
                <label className="block text-sm text-slate-600 mb-1">
                  หมายเหตุ / รายละเอียดเพิ่มเติม
                </label>
                <input
                  value={form.note}
                  onChange={update("note")}
                  placeholder="ระบุเงื่อนไขเพิ่มเติม เช่น รถยก/ต้องการ กำหนดการขนส่ง"
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
                  <div key={h.id} className="rounded-xl bg-white shadow-sm p-4">
                    <div className="text-sm text-slate-600 mb-1">
                      ส่งเมื่อ: {fmtDT(h.submittedAt)} • กำหนดปิดรับข้อเสนอ:{" "}
                      {fmtDT(h.deadline)}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-sm">
                      <Info
                        label="ปริมาณทั้งหมด"
                        value={`${h.qty.toLocaleString("th-TH")} กิโลกรัม`}
                      />
                      <Info
                        label="ราคาที่เสนอ"
                        value={`${h.price.toLocaleString(
                          "th-TH"
                        )} บาท/กิโลกรัม`}
                      />
                      <Info label="วิธีการชำระเงิน" value={h.payMethod} />
                      <Info label="หมายเหตุ" value={h.note || "-"} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
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
