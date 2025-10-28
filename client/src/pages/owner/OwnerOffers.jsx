// src/pages/owner/OwnerOffers.jsx
import React, { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";
import HeaderWrapper from "../../components/HeaderWrapper";
import Card from "../../components/Card";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  listAllContracts,
  approveContract,
  rejectContract,
} from "../../api/contracts";

export default function OwnerOffers() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!user || user.role !== "owner") navigate("/login");
  }, [user, navigate]);

  // โหลดข้อเสนอทั้งหมด
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const all = await listAllContracts();
        if (!alive) return;
        // เรียงตามวันที่ใหม่สุดก่อน
        const sorted = all.sort(
          (a, b) => new Date(b.contract_date) - new Date(a.contract_date)
        );
        setOffers(sorted);
      } catch (e) {
        if (!alive) return;
        setErr(e?.message || "โหลดข้อเสนอไม่สำเร็จ");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const handleApprove = async (id) => {
    if (!window.confirm("ยืนยันการอนุมัติข้อเสนอนี้หรือไม่?")) return;
    try {
      await approveContract(id);
      const all = await listAllContracts();
      setOffers(all);
      alert("อนุมัติข้อเสนอเรียบร้อย ✅");
    } catch (e) {
      alert(e?.message || "ไม่สามารถอนุมัติข้อเสนอได้");
    }
  };

  const handleReject = async (id) => {
    if (!window.confirm("ปฏิเสธข้อเสนอนี้หรือไม่?")) return;
    try {
      await rejectContract(id);
      const all = await listAllContracts();
      setOffers(all);
      alert("ปฏิเสธข้อเสนอเรียบร้อย ❌");
    } catch (e) {
      alert(e?.message || "ไม่สามารถปฏิเสธข้อเสนอได้");
    }
  };

  const fmtDT = (iso) =>
    new Date(iso).toLocaleString("th-TH", {
      dateStyle: "medium",
      timeStyle: "short",
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
          title="ข้อเสนอจากผู้รับเหมา"
          subtitle="พิจารณาข้อเสนอและอนุมัติหรือปฏิเสธ"
        />
        <main className="p-4 sm:p-6 pt-28">
          <div className="max-w-5xl mx-auto space-y-4">
            {loading ? (
              <Card>กำลังโหลดข้อมูล...</Card>
            ) : err ? (
              <Card className="text-rose-600">{err}</Card>
            ) : offers.length === 0 ? (
              <Card className="text-slate-600 text-sm">
                ยังไม่มีข้อเสนอจากผู้รับเหมา
              </Card>
            ) : (
              offers.map((o) => (
                <Card key={o.contract_id} className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold text-lg">
                        #{o.contract_id.slice(0, 8)} — {o.status}
                      </div>
                      <div className="text-sm text-slate-600">
                        ผู้รับเหมา: {o.broker_id ?? "-"} • วันที่ส่ง{" "}
                        {fmtDT(o.contract_date)}
                      </div>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-lg text-sm font-medium ${
                        o.status === "รอการพิจารณา"
                          ? "bg-amber-100 text-amber-700"
                          : o.status === "ยอมรับ"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-rose-100 text-rose-700"
                      }`}
                    >
                      {o.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-sm">
                    <Info
                      label="ปริมาณ"
                      value={`${Number(o.qtt_estimate).toLocaleString("th-TH")} กก.`}
                    />
                    <Info
                      label="ราคาเสนอ"
                      value={`${Number(o.offerprice).toLocaleString("th-TH")} บาท/กก.`}
                    />
                    <Info label="การชำระเงิน" value={o.payment_term} />
                    <Info label="หมายเหตุ" value={o.note || "-"} />
                  </div>

                  {o.status === "รอการพิจารณา" && (
                    <div className="flex gap-3 mt-2">
                      <button
                        onClick={() => handleApprove(o.contract_id)}
                        className="px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-sm"
                      >
                        ✅ อนุมัติ
                      </button>
                      <button
                        onClick={() => handleReject(o.contract_id)}
                        className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm"
                      >
                        ❌ ปฏิเสธ
                      </button>
                    </div>
                  )}
                </Card>
              ))
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
