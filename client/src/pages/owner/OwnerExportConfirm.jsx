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

export default function OwnerExportConfirm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [err, setErr] = useState("");
  const [fruits, setFruits] = useState([]);
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    if (!user || user.role !== "owner") navigate("/login");
  }, [user, navigate]);

  useEffect(() => {
    const f = loadLS(FRUITS_KEY, []) || [];
    const r = loadLS(EXPORT_REQ_KEY, []) || [];
    setFruits(f);
    setRequests(r);
  }, []);

  // สรุปคำขอรอพิจารณา
  const pending = useMemo(
    () => requests.filter((r) => r.status === "รอการยืนยันจากเจ้าของสวน"),
    [requests]
  );

  // ยืนยันคำขอ
  const approve = (reqId) => {
  try {
    const reqAll = loadLS(EXPORT_REQ_KEY, []) || [];
    const idx = reqAll.findIndex((r) => r.id === reqId);
    if (idx === -1) throw new Error("ไม่พบคำขอ");
    const req = reqAll[idx];

    const now = new Date().toISOString();
    const allFruits = loadLS(FRUITS_KEY, []) || [];

    // --- 1. เพิ่มข้อมูลใหม่ type="ส่งออก" ---
    ["A", "B", "C"].forEach((g) => {
      const w = Number(req.grades[g] || 0);
      if (w > 0) {
        allFruits.push({
          id: uuid(),
          broker_id: req.broker_id,
          grade: g,
          weight_kg: w,
          type: "ส่งออก",
          note: `Owner approved export request ${req.id.slice(0, 8)}`,
          harvest_at: now,
        });
      }
    });

    // --- 2. หักน้ำหนักออกจากผลผลิตที่เป็น "เก็บเกี่ยว" ---
    ["A", "B", "C"].forEach((g) => {
      let remain = Number(req.grades[g] || 0);
      for (const rec of allFruits) {
        if (remain <= 0) break;
        if (rec.type === "เก็บเกี่ยว" && rec.grade === g) {
          const w = Number(rec.weight_kg);
          if (w <= remain) {
            rec._remove = true;
            remain -= w;
          } else {
            rec.weight_kg = w - remain;
            remain = 0;
          }
        }
      }
    });

    const updated = allFruits.filter((f) => !f._remove);
    saveLS(FRUITS_KEY, updated);
    setFruits(updated);

    // --- 3. อัปเดตสถานะคำขอ ---
    reqAll[idx] = { ...req, status: "ยืนยันแล้ว", updated_at: now };
    saveLS(EXPORT_REQ_KEY, reqAll);
    setRequests(reqAll);

    alert("ยืนยันคำขอเรียบร้อย — น้ำหนักผลผลิตถูกหักออกแล้ว");
  } catch (e) {
    setErr(e.message);
  }
};


  const reject = (reqId) => {
    const reqAll = loadLS(EXPORT_REQ_KEY, []) || [];
    const idx = reqAll.findIndex((r) => r.id === reqId);
    if (idx === -1) return;
    reqAll[idx].status = "ปฏิเสธแล้ว";
    saveLS(EXPORT_REQ_KEY, reqAll);
    setRequests(reqAll);
  };

  const fmtDT = (iso) => new Date(iso).toLocaleString("th-TH");

  return (
    <div
      className={`min-h-screen w-full bg-slate-50 text-slate-900 flex flex-col md:flex-row ${
        isSidebarOpen ? "overflow-hidden md:overflow-auto" : ""
      }`}
    >
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="flex-1 min-w-0 flex flex-col">
        <HeaderWrapper
          onMenuClick={() => setIsSidebarOpen(true)}
          title="พิจารณาคำขอส่งออก (เจ้าของสวน)"
          subtitle="ตรวจสอบและยืนยันคำขอส่งออกจากผู้รับเหมา"
        />
        <main className="p-4 sm:p-6 pt-28">
          <div className="max-w-5xl mx-auto space-y-4">
            {err && <Card className="text-rose-600">{err}</Card>}
            <Card>
              <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left bg-slate-50 text-slate-600">
                      <th className="py-2 px-3">วันที่</th>
                      <th className="py-2 px-3">Broker</th>
                      <th className="py-2 px-3">A</th>
                      <th className="py-2 px-3">B</th>
                      <th className="py-2 px-3">C</th>
                      <th className="py-2 px-3">รวม</th>
                      <th className="py-2 px-3">สถานะ</th>
                      <th className="py-2 px-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {pending.length === 0 ? (
                      <tr>
                        <td className="py-3 px-3" colSpan={8}>
                          ไม่มีคำขอรอพิจารณา
                        </td>
                      </tr>
                    ) : (
                      pending.map((r) => {
                        const a = Number(r.grades.A || 0);
                        const b = Number(r.grades.B || 0);
                        const c = Number(r.grades.C || 0);
                        const sum = a + b + c;
                        return (
                          <tr key={r.id} className="odd:bg-white even:bg-slate-50/60">
                            <td className="py-2 px-3">{fmtDT(r.created_at)}</td>
                            <td className="py-2 px-3">#{r.broker_id}</td>
                            <td className="py-2 px-3">{a}</td>
                            <td className="py-2 px-3">{b}</td>
                            <td className="py-2 px-3">{c}</td>
                            <td className="py-2 px-3">{sum}</td>
                            <td className="py-2 px-3">{r.status}</td>
                            <td className="py-2 px-3">
                              <div className="flex gap-2">
                                <PrimaryButton title="ยืนยัน" onClick={() => approve(r.id)} />
                                <button
                                  onClick={() => reject(r.id)}
                                  className="px-3 py-1.5 rounded-lg text-sm bg-rose-600 text-white hover:bg-rose-700"
                                >
                                  ปฏิเสธ
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
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
