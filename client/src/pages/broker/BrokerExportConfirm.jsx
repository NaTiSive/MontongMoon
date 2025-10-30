// src/pages/broker/BrokerExportConfirm.jsx
import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "../../components/Sidebar";
import HeaderWrapper from "../../components/HeaderWrapper";
import Card from "../../components/Card";
import PrimaryButton from "../../components/PrimaryButton";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const FRUITS_KEY = "mm:fruits@v1";
const EXPORT_REQ_KEY = "mm:export-requests@v1";

function loadLS(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback ?? null)); }
  catch { return fallback ?? null; }
}
function saveLS(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}
function uuid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0, v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default function BrokerExportConfirm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!user || user.role !== "broker") navigate("/login");
  }, [user, navigate]);

  // === STOCK SUMMARY (อ่านจาก FRUITS_KEY ของ broker คนนี้) ===
  const rows = loadLS(FRUITS_KEY, []) || [];
  const myFruits = rows.filter(
    (r) => String(r?.broker_id) === String(user?.broker_id)
  );

  const sumBy = (grade) => {
    const harvest = myFruits
      .filter((r) => r.grade === grade && r.type !== "ส่งออก")
      .reduce((s, r) => s + Number(r.weight_kg || 0), 0);
    const exported = myFruits
      .filter((r) => r.grade === grade && r.type === "ส่งออก")
      .reduce((s, r) => s + Number(r.weight_kg || 0), 0);
    return Math.max(0, harvest - exported);
  };

  const stock = useMemo(
    () => ({ A: sumBy("A"), B: sumBy("B"), C: sumBy("C") }),
    [rows]
  );

  // === MY REQUESTS TABLE (อ่าน/กรองเฉพาะของ broker นี้) ===
  const allReq = loadLS(EXPORT_REQ_KEY, []) || [];
  const myReq = useMemo(
    () =>
      allReq
        .filter((r) => String(r.broker_id) === String(user?.broker_id))
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(allReq), user?.broker_id]
  );

  // ส่งคำขอให้ Owner พิจารณา (UC15)
  const sendExportRequest = () => {
    try {
      const reqAll = loadLS(EXPORT_REQ_KEY, []) || [];
      const newReq = {
        id: uuid(),
        broker_id: user?.broker_id,
        owner_id: 1,
        grades: { ...stock }, // ใช้สต็อกปัจจุบัน ณ เวลากด
        created_at: new Date().toISOString(),
        updated_at: null,
        status: "รอการยืนยันจากเจ้าของสวน",
      };
      reqAll.unshift(newReq);
      saveLS(EXPORT_REQ_KEY, reqAll);
      alert("ส่งคำขอให้เจ้าของสวนพิจารณาแล้ว");
      navigate("/broker/dashboard");
    } catch (e) {
      setErr(e?.message || "ไม่สามารถส่งคำขอได้");
    }
  };

  // ยกเลิกคำขอ (เฉพาะที่ยังรออยู่)
const cancelRequest = (id) => {
  const reqAll = loadLS(EXPORT_REQ_KEY, []) || [];
  const idx = reqAll.findIndex(
    (r) => r.id === id && String(r.broker_id) === String(user?.broker_id)
  );
  if (idx === -1) return;
  if (reqAll[idx].status !== "รอการยืนยันจากเจ้าของสวน") {
    return alert("ยกเลิกได้เฉพาะคำขอที่ยังรอการยืนยันเท่านั้น");
  }
  reqAll[idx].status = "ผู้รับเหมาถอนคำขอ";
  reqAll[idx].updated_at = new Date().toISOString();
  saveLS(EXPORT_REQ_KEY, reqAll);
  alert("ยกเลิกคำขอเรียบร้อย");
  window.location.reload(); // refresh mock
};


  const fmtDT = (iso) =>
    new Date(iso).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });

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
          title="ส่งคำขอส่งออก (ผู้รับเหมา)"
          subtitle="ตรวจสอบปริมาณที่พร้อมส่งออก แล้วส่งคำขอให้เจ้าของสวนพิจารณา"
        />

        <main className="p-4 sm:p-6 pt-28">
          <div className="max-w-5xl mx-auto space-y-4">
            {err && <Card className="text-rose-600">{err}</Card>}

            {/* สรุปปริมาณพร้อมส่งออก */}
            <Card>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {["A", "B", "C"].map((g) => (
                  <div key={g}>
                    <div className="text-slate-500 text-sm">ทุเรียนเกรด {g} พร้อมส่งออก (กก.)</div>
                    <div className="text-2xl font-semibold">
                      {stock[g].toLocaleString("th-TH")}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex justify-end">
                <PrimaryButton
                  title="ส่งคำขอให้เจ้าของสวนพิจารณา"
                  onClick={sendExportRequest}
                />
              </div>
            </Card>

            {/* ตารางคำขอของฉัน */}
            <Card>
              <h3 className="font-semibold mb-2">คำขอส่งออกของฉัน</h3>
              <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left bg-slate-50 text-slate-600">
                      <th className="py-2 px-3">วันที่</th>
                      <th className="py-2 px-3">A</th>
                      <th className="py-2 px-3">B</th>
                      <th className="py-2 px-3">C</th>
                      <th className="py-2 px-3">รวม (กก.)</th>
                      <th className="py-2 px-3">สถานะ</th>
                      <th className="py-2 px-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {myReq.length === 0 ? (
                      <tr>
                        <td className="py-3 px-3" colSpan={7}>ยังไม่มีคำขอส่งออก</td>
                      </tr>
                    ) : (
                      myReq.map((r, i) => {
                        const a = Number(r.grades?.A || 0);
                        const b = Number(r.grades?.B || 0);
                        const c = Number(r.grades?.C || 0);
                        const sum = a + b + c;
                        const pending = r.status === "รอการยืนยันจากเจ้าของสวน";
                        return (
                          <tr key={r.id} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
                            <td className="py-2 px-3">{fmtDT(r.created_at)}</td>
                            <td className="py-2 px-3">{a.toLocaleString("th-TH")}</td>
                            <td className="py-2 px-3">{b.toLocaleString("th-TH")}</td>
                            <td className="py-2 px-3">{c.toLocaleString("th-TH")}</td>
                            <td className="py-2 px-3">{sum.toLocaleString("th-TH")}</td>
                            <td className="py-2 px-3">{r.status}</td>
                            <td className="py-2 px-3">
                              {pending ? (
                                <button
                                  onClick={() => cancelRequest(r.id)}
                                  className="px-3 py-1.5 rounded-lg text-sm bg-rose-600 text-white hover:bg-rose-700"
                                >
                                  ยกเลิกคำขอ
                                </button>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                * “ยืนยันแล้ว” หมายถึงเจ้าของสวนกดอนุมัติ และสต็อกฝั่งคุณถูกตัดด้วยเรคคอร์ด type="ส่งออก"
              </p>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
