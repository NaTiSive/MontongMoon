// src/pages/owner/OwnerOffers.jsx
import React, { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";
import HeaderWrapper from "../../components/HeaderWrapper";
import Card from "../../components/Card";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  listContracts,
  approveContractAndBroker,
  rejectContract,
} from "../../api/contracts";

export default function OwnerOffers() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (!user || user.role !== "owner") {
      navigate("/login");
    }
  }, [user, navigate]);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const load = () => {
    try {
      setLoading(true);
      const pending = listContracts({ status: "รอการพิจารณา" });
      setRows(pending);
      setErr("");
    } catch (e) {
      setErr(e?.message || "โหลดข้อเสนอไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onApprove = (id) => {
    try {
      const row = approveContractAndBroker(id);
      alert(
        `อนุมัติข้อเสนอสำเร็จ\nContract: ${row.contract_id}\nBroker #${row.broker_id} ได้รับการอนุมัติใช้งานระบบแล้ว`
      );
      load();
    } catch (e) {
      alert(e?.message || "อนุมัติไม่สำเร็จ");
    }
  };

  const onReject = (id) => {
    const reason = prompt("เหตุผลการปฏิเสธ (ไม่บังคับ)", "");
    try {
      rejectContract(id, reason || "");
      alert("ปฏิเสธข้อเสนอแล้ว");
      load();
    } catch (e) {
      alert(e?.message || "ปฏิเสธไม่สำเร็จ");
    }
  };

  const fmtDT = (iso) =>
    new Date(iso).toLocaleString("th-TH", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

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
          title="ข้อเสนอจากนายหน้า"
          subtitle="ตรวจสอบและอนุมัติข้อเสนอ"
        />

        <main className="p-4 sm:p-6 pt-28">
          <div className="max-w-4xl mx-auto space-y-4">
            <Card>
              {loading ? (
                <div className="text-sm text-slate-500">กำลังโหลด...</div>
              ) : err ? (
                <div className="text-sm text-rose-600">{err}</div>
              ) : rows.length === 0 ? (
                <div className="text-sm text-slate-600">
                  ยังไม่มีข้อเสนอรอการพิจารณา
                </div>
              ) : (
                <div className="space-y-3">
                  {rows.map((r) => (
                    <div
                      key={r.contract_id}
                      className="rounded-xl bg-white border p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-semibold">
                          Contract: {r.contract_id}
                        </div>
                        <div className="text-xs text-slate-500">
                          ส่งเมื่อ {fmtDT(r.contract_date)}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm mt-2">
                        <Info label="Broker ID" value={`#${r.broker_id}`} />
                        <Info
                          label="ปริมาณ"
                          value={`${r.qtt_estimate?.toLocaleString("th-TH")} กก.`}
                        />
                        <Info
                          label="ราคาเสนอ"
                          value={`${r.offerprice?.toLocaleString("th-TH")} บาท/กก.`}
                        />
                        <Info label="วิธีชำระเงิน" value={r.payment_term} />
                        <Info label="หมายเหตุ" value={r.note || "-"} />
                        <Info label="สถานะ" value={r.status} />
                      </div>
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => onApprove(r.contract_id)}
                          className="px-3 py-2 rounded-lg bg-emerald-700 text-white text-sm"
                        >
                          อนุมัติ
                        </button>
                        <button
                          onClick={() => onReject(r.contract_id)}
                          className="px-3 py-2 rounded-lg border text-sm"
                        >
                          ปฏิเสธ
                        </button>
                      </div>
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

function Info({ label, value }) {
  return (
    <div>
      <div className="text-slate-500">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
