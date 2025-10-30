import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "../../components/Sidebar";
import HeaderWrapper from "../../components/HeaderWrapper";
import Card from "../../components/Card";
import PrimaryButton from "../../components/PrimaryButton";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { createTransaction } from "../../api/accounts"; // ✅ เพิ่มเพื่อสร้างรายรับ

const FRUITS_KEY = "mm:fruits@v1";
const EXPORT_REQ_KEY = "mm:export-requests@v1";
const CONTRACTS_KEY = "mm:contracts@v1";

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

// หาข้อเสนอที่ "ยอมรับ" ล่าสุดของ broker เพื่อนำราคา A,B,C มาใช้คำนวณรายรับ
function findLatestAcceptedContractForBroker(broker_id) {
  const all = loadLS(CONTRACTS_KEY, []) || [];
  const accepted = all
    .filter(c => String(c.broker_id) === String(broker_id) && c.status === "ยอมรับ")
    .sort((a, b) => new Date(b.contract_date) - new Date(a.contract_date));
  return accepted[0] || null;
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

  // คำขอที่รอการยืนยัน
  const pending = useMemo(
    () => requests.filter((r) => r.status === "รอการยืนยันจากเจ้าของสวน"),
    [requests]
  );

  const fmtDT = (iso) => new Date(iso).toLocaleString("th-TH");

  // ✅ อนุมัติคำขอ:
  // 1) เพิ่ม record type="ส่งออก" ต่อเกรด
  // 2) หักสต็อกจาก "เก็บเกี่ยว" ตามน้ำหนักที่ส่งออก
  // 3) บันทึกรายรับ (หนึ่งรายการต่อเกรดที่ > 0) = weight_kg * price_by_grade
  // 4) อัปเดตสถานะคำขอเป็น "ยืนยันแล้ว"
  const approve = (reqId) => {
    try {
      const reqAll = loadLS(EXPORT_REQ_KEY, []) || [];
      const idx = reqAll.findIndex((r) => r.id === reqId);
      if (idx === -1) throw new Error("ไม่พบคำขอ");
      const req = reqAll[idx];

      const now = new Date().toISOString();
      const allFruits = loadLS(FRUITS_KEY, []) || [];

      // --- 1) เพิ่มข้อมูล "ส่งออก"
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

      // --- 2) หักสต็อกจาก "เก็บเกี่ยว"
      ["A", "B", "C"].forEach((g) => {
        let remain = Number(req.grades[g] || 0);
        if (remain <= 0) return;
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

      const updatedFruits = allFruits.filter((f) => !f._remove);
      saveLS(FRUITS_KEY, updatedFruits);
      setFruits(updatedFruits);

      // --- 3) บันทึกรายรับจากราคาใน "ข้อเสนอที่ยอมรับล่าสุด" ของ broker
      const contract = findLatestAcceptedContractForBroker(req.broker_id);
      if (!contract || !contract.offerprice_by_grade) {
        // ถ้าไม่พบราคา ก็ยังอนุมัติส่งออกได้ แต่แจ้งเตือน และไม่สร้างรายการรายรับ
        console.warn("ไม่พบข้อเสนอที่ยอมรับของ broker เพื่อคำนวณรายรับ");
      } else {
        const priceByGrade = contract.offerprice_by_grade; // {A,B,C}
        // สร้าง 1 transaction ต่อเกรดที่มีน้ำหนัก
        ["A", "B", "C"].forEach((g) => {
          const w = Number(req.grades[g] || 0);
          const p = Number(priceByGrade[g] || 0);
          if (w > 0 && p > 0) {
            const amount = w * p;
            createTransaction(null, {
              type: "รายรับ",
              amount,
              payment_method: "โอนเงิน",
              note: `รายรับจากการส่งออก เกรด ${g} — น้ำหนัก ${w.toLocaleString()} กก. × ราคา ${p.toLocaleString()} บาท/กก. (Broker #${req.broker_id}, ข้อเสนอ ${contract.contract_id.slice(0,8)})`,
              invoice_ref: `EXPORT-${req.id.slice(0, 8)}-${g}`,
            });
          }
        });
      }

      // --- 4) อัปเดตสถานะคำขอ
      reqAll[idx] = { ...req, status: "ยืนยันแล้ว", updated_at: now };
      saveLS(EXPORT_REQ_KEY, reqAll);
      setRequests(reqAll);

      alert("ยืนยันคำขอเรียบร้อย — หักสต็อกและบันทึกรายรับแล้ว");
    } catch (e) {
      setErr(e.message || "ดำเนินการไม่สำเร็จ");
    }
  };

  const reject = (reqId) => {
    const reqAll = loadLS(EXPORT_REQ_KEY, []) || [];
    const idx = reqAll.findIndex((r) => r.id === reqId);
    if (idx === -1) return;
    reqAll[idx].status = "ปฏิเสธแล้ว";
    reqAll[idx].updated_at = new Date().toISOString();
    saveLS(EXPORT_REQ_KEY, reqAll);
    setRequests(reqAll);
  };

  // ตารางประวัติคำขอส่งออกทั้งหมด (เหมือนฝั่ง broker)
  const history = useMemo(
    () =>
      (requests || [])
        .slice()
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    [requests]
  );

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

            {/* คำขอที่รอพิจารณา */}
            <Card>
              <div className="text-sm text-slate-700 mb-2">คำขอที่รอการยืนยัน</div>
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

            {/* ✅ ประวัติคำขอทั้งหมด (เหมือนฝั่ง broker) */}
            <Card>
              <div className="text-sm text-slate-700 mb-2">ประวัติคำขอส่งออก</div>
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
                    </tr>
                  </thead>
                  <tbody>
                    {history.length === 0 ? (
                      <tr>
                        <td className="py-3 px-3" colSpan={7}>
                          ยังไม่มีประวัติคำขอ
                        </td>
                      </tr>
                    ) : (
                      history.map((r, i) => {
                        const a = Number(r.grades?.A || 0);
                        const b = Number(r.grades?.B || 0);
                        const c = Number(r.grades?.C || 0);
                        const sum = a + b + c;
                        return (
                          <tr key={r.id} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
                            <td className="py-2 px-3">{fmtDT(r.created_at)}</td>
                            <td className="py-2 px-3">#{r.broker_id}</td>
                            <td className="py-2 px-3">{a}</td>
                            <td className="py-2 px-3">{b}</td>
                            <td className="py-2 px-3">{c}</td>
                            <td className="py-2 px-3">{sum}</td>
                            <td className="py-2 px-3">{r.status}</td>
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
