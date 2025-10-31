import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "../../components/Sidebar";
import HeaderWrapper from "../../components/HeaderWrapper";
import Card from "../../components/Card";
import PrimaryButton from "../../components/PrimaryButton";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  listAllExportRequests,
  ownerApproveExportRequest,
  ownerRejectExportRequest,
} from "../../api/export";

export default function OwnerExportConfirm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [err, setErr] = useState("");
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || user.role !== "owner") navigate("/login");
  }, [user, navigate]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const all = await listAllExportRequests();
        if (!alive) return;
        setRequests(all);
        setErr("");
      } catch (e) {
        if (!alive) return;
        setErr(e?.message || "โหลดข้อมูลไม่สำเร็จ");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const pending = useMemo(
    () => requests.filter((r) => r.status === "รอการยืนยันจากเจ้าของสวน"),
    [requests]
  );

  const fmtDT = (iso) => new Date(iso).toLocaleString("th-TH");

  const approve = async (reqId) => {
    try {
      const res = await ownerApproveExportRequest(reqId);
      setRequests((prev) =>
        prev.map((r) => (r.id === reqId ? res?.request ?? r : r))
      );
      alert("ยืนยันคำขอเรียบร้อย — ระบบได้ตัดสต็อกและลงรายรับให้แล้ว");
    } catch (e) {
      setErr(e?.message || "ดำเนินการไม่สำเร็จ");
    }
  };

  const reject = async (reqId) => {
    try {
      const res = await ownerRejectExportRequest(reqId);
      setRequests((prev) =>
        prev.map((r) => (r.id === reqId ? res ?? r : r))
      );
    } catch (e) {
      setErr(e?.message || "ปฏิเสธไม่สำเร็จ");
    }
  };

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
                      <th className="py-2 px-3">รวม (กก.)</th>
                      <th className="py-2 px-3">สถานะ</th>
                      <th className="py-2 px-3">การกระทำ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td className="py-3 px-3" colSpan={8}>
                          กำลังโหลด...
                        </td>
                      </tr>
                    ) : pending.length === 0 ? (
                      <tr>
                        <td className="py-3 px-3" colSpan={8}>
                          ไม่มีคำขอที่รอการยืนยัน
                        </td>
                      </tr>
                    ) : (
                      pending.map((r) => (
                        <tr key={r.id} className="bg-white">
                          <td className="py-2 px-3">{fmtDT(r.created_at)}</td>
                          <td className="py-2 px-3">Broker #{r.broker_id}</td>
                          <td className="py-2 px-3">{r.grades.A}</td>
                          <td className="py-2 px-3">{r.grades.B}</td>
                          <td className="py-2 px-3">{r.grades.C}</td>
                          <td className="py-2 px-3">{r.grades.total}</td>
                          <td className="py-2 px-3">
                            <span className="px-3 py-1 rounded-lg bg-amber-100 text-amber-700 text-xs font-medium">
                              {r.status}
                            </span>
                          </td>
                          <td className="py-2 px-3 flex gap-2">
                            <button
                              onClick={() => approve(r.id)}
                              className="px-3 py-1.5 rounded-lg text-white text-xs bg-emerald-700 hover:bg-emerald-800"
                            >
                              อนุมัติ
                            </button>
                            <button
                              onClick={() => reject(r.id)}
                              className="px-3 py-1.5 rounded-lg text-white text-xs bg-rose-700 hover:bg-rose-800"
                            >
                              ปฏิเสธ
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card>
              <div className="text-sm text-slate-700 mb-2">ประวัติคำขอทั้งหมด</div>
              <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left bg-slate-50 text-slate-600">
                      <th className="py-2 px-3">วันที่</th>
                      <th className="py-2 px-3">Broker</th>
                      <th className="py-2 px-3">A</th>
                      <th className="py-2 px-3">B</th>
                      <th className="py-2 px-3">C</th>
                      <th className="py-2 px-3">รวม (กก.)</th>
                      <th className="py-2 px-3">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.length === 0 ? (
                      <tr>
                        <td className="py-3 px-3" colSpan={7}>
                          ยังไม่มีคำขอส่งออก
                        </td>
                      </tr>
                    ) : (
                      history.map((r) => (
                        <tr key={r.id} className="bg-white">
                          <td className="py-2 px-3">{fmtDT(r.created_at)}</td>
                          <td className="py-2 px-3">Broker #{r.broker_id}</td>
                          <td className="py-2 px-3">{r.grades.A}</td>
                          <td className="py-2 px-3">{r.grades.B}</td>
                          <td className="py-2 px-3">{r.grades.C}</td>
                          <td className="py-2 px-3">{r.grades.total}</td>
                          <td className="py-2 px-3">
                            <span className="px-3 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-700">
                              {r.status}
                            </span>
                          </td>
                        </tr>
                      ))
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
